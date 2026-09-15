package com.dentcare.billing.service;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidBillingAmountException;
import com.dentcare.billing.exception.OverpaymentException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BillingCalculationServiceTest {

    private BillingCalculationService service;

    @BeforeEach
    void setUp() {
        service = new BillingCalculationService();
    }

    // -------------------------------------------------------------------------
    // 1. Line Calculations
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("1. valid quantity * unit price calculates line total correctly")
    void testCalculateLineTotalValid() {
        BigDecimal result = service.calculateLineTotal(3, new BigDecimal("45.50"));
        assertThat(result).isEqualByComparingTo(new BigDecimal("136.50"));
    }

    @Test
    @DisplayName("2. zero unit price is allowed and calculates to zero line total")
    void testCalculateLineTotalZeroUnitPrice() {
        BigDecimal result = service.calculateLineTotal(1, BigDecimal.ZERO);
        assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("3. zero or negative quantity is rejected with InvalidBillingAmountException")
    void testCalculateLineTotalNegativeOrZeroQuantity() {
        assertThatThrownBy(() -> service.calculateLineTotal(0, new BigDecimal("50.00")))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("Quantity must be at least 1");

        assertThatThrownBy(() -> service.calculateLineTotal(-2, new BigDecimal("50.00")))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("Quantity must be at least 1");

        assertThatThrownBy(() -> service.calculateLineTotal(null, new BigDecimal("50.00")))
                .isInstanceOf(InvalidBillingAmountException.class);
    }

    @Test
    @DisplayName("4. negative unit price is rejected with InvalidBillingAmountException")
    void testCalculateLineTotalNegativeUnitPrice() {
        assertThatThrownBy(() -> service.calculateLineTotal(2, new BigDecimal("-10.00")))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("Unit price must be non-negative");

        assertThatThrownBy(() -> service.calculateLineTotal(1, null))
                .isInstanceOf(InvalidBillingAmountException.class);
    }

    // -------------------------------------------------------------------------
    // 2. Subtotal Calculations
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("5. multiple item line totals sum correctly into subtotal")
    void testCalculateSubtotalMultipleItems() {
        Invoice invoice = new Invoice("INV-001", 1L, LocalDate.now());
        InvoiceItem item1 = new InvoiceItem(invoice, "Item 1", 1, new BigDecimal("50.00"), new BigDecimal("50.00"));
        InvoiceItem item2 = new InvoiceItem(invoice, "Item 2", 2, new BigDecimal("25.25"), new BigDecimal("50.50"));
        InvoiceItem item3 = new InvoiceItem(invoice, "Item 3", 1, new BigDecimal("10.00"), new BigDecimal("10.00"));

        BigDecimal subtotal = service.calculateSubtotal(List.of(item1, item2, item3));
        assertThat(subtotal).isEqualByComparingTo(new BigDecimal("110.50"));
    }

    @Test
    @DisplayName("6. empty or null item list safely results in zero subtotal")
    void testCalculateSubtotalEmptyOrNull() {
        assertThat(service.calculateSubtotal(null)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(service.calculateSubtotal(Collections.emptyList())).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(service.calculateSubtotalFromTotals(null)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(service.calculateSubtotalFromTotals(Collections.emptyList())).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // -------------------------------------------------------------------------
    // 3. Discount and Total Calculations
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("7. zero or null discount produces final total equal to subtotal")
    void testCalculateTotalZeroDiscount() {
        BigDecimal subtotal = new BigDecimal("150.00");
        assertThat(service.calculateTotal(subtotal, BigDecimal.ZERO)).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(service.calculateTotal(subtotal, null)).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("8. valid discount deducts from subtotal correctly")
    void testCalculateTotalValidDiscount() {
        BigDecimal subtotal = new BigDecimal("200.00");
        BigDecimal discount = new BigDecimal("25.00");
        BigDecimal total = service.calculateTotal(subtotal, discount);
        assertThat(total).isEqualByComparingTo(new BigDecimal("175.00"));
    }

    @Test
    @DisplayName("9. negative discount is rejected with InvalidBillingAmountException")
    void testCalculateTotalNegativeDiscount() {
        BigDecimal subtotal = new BigDecimal("100.00");
        BigDecimal negativeDiscount = new BigDecimal("-15.00");
        assertThatThrownBy(() -> service.calculateTotal(subtotal, negativeDiscount))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("Discount amount cannot be negative");
    }

    @Test
    @DisplayName("10. discount greater than subtotal is rejected")
    void testCalculateTotalDiscountExceedingSubtotal() {
        BigDecimal subtotal = new BigDecimal("100.00");
        BigDecimal excessiveDiscount = new BigDecimal("105.00");
        assertThatThrownBy(() -> service.calculateTotal(subtotal, excessiveDiscount))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("cannot exceed invoice subtotal");
    }

    // -------------------------------------------------------------------------
    // 4. Paid Amount Normalization
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("11. repository null aggregate is normalized to zero BigDecimal")
    void testNormalizePaidAmountNullToZero() {
        BigDecimal result = service.normalizePaidAmount(null);
        assertThat(result).isNotNull();
        assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("12. valid recorded paid amount is preserved with proper scale")
    void testNormalizePaidAmountValid() {
        BigDecimal input = new BigDecimal("85.75");
        BigDecimal result = service.normalizePaidAmount(input);
        assertThat(result).isEqualByComparingTo(new BigDecimal("85.75"));
    }

    // -------------------------------------------------------------------------
    // 5. Balance Calculations
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("13. valid unpaid balance equals full total when paid amount is zero")
    void testCalculateBalanceUnpaid() {
        BigDecimal total = new BigDecimal("150.00");
        BigDecimal balance = service.calculateBalance(total, BigDecimal.ZERO);
        assertThat(balance).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("14. partial payment calculates remaining balance correctly")
    void testCalculateBalancePartial() {
        BigDecimal total = new BigDecimal("200.00");
        BigDecimal paid = new BigDecimal("60.00");
        BigDecimal balance = service.calculateBalance(total, paid);
        assertThat(balance).isEqualByComparingTo(new BigDecimal("140.00"));
    }

    @Test
    @DisplayName("15. fully paid balance equals zero")
    void testCalculateBalanceFullyPaid() {
        BigDecimal total = new BigDecimal("120.00");
        BigDecimal paid = new BigDecimal("120.00");
        BigDecimal balance = service.calculateBalance(total, paid);
        assertThat(balance).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("16. paid amount greater than total is rejected as invalid financial state")
    void testCalculateBalancePaidExceedingTotal() {
        BigDecimal total = new BigDecimal("100.00");
        BigDecimal paid = new BigDecimal("120.00");
        assertThatThrownBy(() -> service.calculateBalance(total, paid))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("cannot exceed invoice total amount");
    }

    // -------------------------------------------------------------------------
    // 6. Payment Validation
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("17. positive payment amount strictly below outstanding balance is accepted")
    void testValidatePaymentAmountBelowBalance() {
        service.validatePaymentAmount(new BigDecimal("50.00"), new BigDecimal("100.00"));
        // No exception thrown
    }

    @Test
    @DisplayName("18. payment amount exactly equal to outstanding balance is accepted")
    void testValidatePaymentAmountEqualToBalance() {
        service.validatePaymentAmount(new BigDecimal("100.00"), new BigDecimal("100.00"));
        // No exception thrown
    }

    @Test
    @DisplayName("19. zero payment amount is rejected with InvalidBillingAmountException")
    void testValidatePaymentAmountZero() {
        assertThatThrownBy(() -> service.validatePaymentAmount(BigDecimal.ZERO, new BigDecimal("100.00")))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("Payment amount must be strictly greater than zero");
    }

    @Test
    @DisplayName("20. negative payment amount is rejected with InvalidBillingAmountException")
    void testValidatePaymentAmountNegative() {
        assertThatThrownBy(() -> service.validatePaymentAmount(new BigDecimal("-25.00"), new BigDecimal("100.00")))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("Payment amount must be strictly greater than zero");
    }

    @Test
    @DisplayName("21. payment exceeding outstanding balance is rejected with OverpaymentException (BR-10)")
    void testValidatePaymentAmountOverpayment() {
        BigDecimal payment = new BigDecimal("150.00");
        BigDecimal balance = new BigDecimal("100.00");

        assertThatThrownBy(() -> service.validatePaymentAmount(payment, balance))
                .isInstanceOf(OverpaymentException.class)
                .satisfies(ex -> {
                    OverpaymentException oe = (OverpaymentException) ex;
                    assertThat(oe.getPaymentAmount()).isEqualByComparingTo(payment);
                    assertThat(oe.getRemainingBalance()).isEqualByComparingTo(balance);
                });
    }

    // -------------------------------------------------------------------------
    // 7. Precision & Floating-Point Safety
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("22. calculations avoid binary floating point errors and preserve exact cents")
    void testPrecisionFloatingPointSafety() {
        // In IEEE 754 float/double, 0.1 + 0.2 != 0.3 (0.30000000000000004)
        BigDecimal item1Price = new BigDecimal("0.10");
        BigDecimal item2Price = new BigDecimal("0.20");

        Invoice invoice = new Invoice("INV-PRECISION", 1L, LocalDate.now());
        InvoiceItem item1 = new InvoiceItem(invoice, "Item 1", 1, item1Price, item1Price);
        InvoiceItem item2 = new InvoiceItem(invoice, "Item 2", 1, item2Price, item2Price);

        BigDecimal subtotal = service.calculateSubtotal(List.of(item1, item2));
        assertThat(subtotal).isEqualByComparingTo(new BigDecimal("0.30"));

        BigDecimal total = service.calculateTotal(subtotal, BigDecimal.ZERO);
        assertThat(total).isEqualByComparingTo(new BigDecimal("0.30"));

        BigDecimal balance = service.calculateBalance(total, new BigDecimal("0.10"));
        assertThat(balance).isEqualByComparingTo(new BigDecimal("0.20"));
    }

    // -------------------------------------------------------------------------
    // 8. In-Memory Entity Recalculation Helper
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("recalculateInvoiceTotals updates all in-memory invoice monetary fields correctly")
    void testRecalculateInvoiceTotals() {
        Invoice invoice = new Invoice("INV-RECALC-01", 101L, LocalDate.now());
        InvoiceItem item1 = new InvoiceItem(invoice, "Cleaning", 1, new BigDecimal("80.00"), new BigDecimal("80.00"));
        InvoiceItem item2 = new InvoiceItem(invoice, "Fluoride", 2, new BigDecimal("25.00"), new BigDecimal("50.00"));
        invoice.addItem(item1);
        invoice.addItem(item2);
        invoice.setDiscountAmount(new BigDecimal("10.00"));

        // Raw payment aggregate from PaymentRepository = 50.00
        service.recalculateInvoiceTotals(invoice, new BigDecimal("50.00"));

        assertThat(invoice.getSubtotal()).isEqualByComparingTo(new BigDecimal("130.00"));
        assertThat(invoice.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(invoice.getTotalAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("70.00"));
    }
}
