package com.dentcare.billing.mapper;

import com.dentcare.billing.dto.IncomeSummaryResponse;
import com.dentcare.billing.dto.InvoiceItemResponse;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BillingMapperTest {

    private BillingMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new BillingMapper();
    }

    @Test
    @DisplayName("10. InvoiceItem mapper preserves numeric values exactly without alteration")
    void testInvoiceItemMapperPreservesNumerics() {
        Invoice invoice = new Invoice("INV-2026-001", 101L, LocalDate.now());
        BigDecimal unitPrice = new BigDecimal("45.555");
        BigDecimal lineTotal = new BigDecimal("136.665");

        InvoiceItem item = new InvoiceItem(invoice, 501L, "Scaling & Polishing", 3, unitPrice, lineTotal);
        item.setId(1001L);

        InvoiceItemResponse response = mapper.toItemResponse(item);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1001L);
        assertThat(response.treatmentProcedureId()).isEqualTo(501L);
        assertThat(response.description()).isEqualTo("Scaling & Polishing");
        assertThat(response.quantity()).isEqualTo(3);
        assertThat(response.unitPrice()).isEqualByComparingTo(unitPrice);
        assertThat(response.lineTotal()).isEqualByComparingTo(lineTotal);
    }

    @Test
    @DisplayName("11. Invoice mapper produces item and payment responses without recursive entity references")
    void testInvoiceMapperProducesSafeResponsesWithoutRecursion() {
        Invoice invoice = new Invoice("INV-2026-002", 102L, LocalDate.of(2026, 4, 1));
        invoice.setId(201L);
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);

        InvoiceItem item1 = new InvoiceItem(invoice, "Consultation", 1, new BigDecimal("50.00"), new BigDecimal("50.00"));
        item1.setId(301L);
        invoice.addItem(item1);

        Payment payment1 = new Payment(invoice, "REC-2026-001", new BigDecimal("20.00"),
                PaymentMethod.CASH, "CASH-REC-1", LocalDateTime.now(), 999L);
        payment1.setId(401L);
        invoice.getPayments().add(payment1);

        InvoiceResponse response = mapper.toInvoiceResponse(invoice);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(201L);
        assertThat(response.invoiceNumber()).isEqualTo("INV-2026-002");
        assertThat(response.items()).hasSize(1);
        assertThat(response.payments()).hasSize(1);

        // Verify nested responses contain scalar references only
        InvoiceItemResponse itemResp = response.items().get(0);
        assertThat(itemResp.id()).isEqualTo(301L);
        assertThat(itemResp.description()).isEqualTo("Consultation");

        PaymentResponse paymentResp = response.payments().get(0);
        assertThat(paymentResp.id()).isEqualTo(401L);
        assertThat(paymentResp.invoiceId()).isEqualTo(201L);
        assertThat(paymentResp.paymentNumber()).isEqualTo("REC-2026-001");
    }

    @Test
    @DisplayName("12. Invoice response preserves subtotal, discount, total, paid, and balance without forced scale changes")
    void testInvoiceResponsePreservesMonetaryTotalsExactly() {
        Invoice invoice = new Invoice("INV-2026-003", 103L, LocalDate.of(2026, 5, 10));
        BigDecimal subtotal = new BigDecimal("100.5");
        BigDecimal discount = new BigDecimal("10.25");
        BigDecimal total = new BigDecimal("90.25");
        BigDecimal paid = new BigDecimal("50.125");
        BigDecimal balance = new BigDecimal("40.125");

        invoice.setSubtotal(subtotal);
        invoice.setDiscountAmount(discount);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setBalanceAmount(balance);
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        invoice.setNotes("Treatment plan follow-up");

        InvoiceResponse response = mapper.toInvoiceResponse(invoice);

        assertThat(response.subtotal()).isEqualByComparingTo(subtotal);
        assertThat(response.discountAmount()).isEqualByComparingTo(discount);
        assertThat(response.totalAmount()).isEqualByComparingTo(total);
        assertThat(response.paidAmount()).isEqualByComparingTo(paid);
        assertThat(response.balanceAmount()).isEqualByComparingTo(balance);
        assertThat(response.status()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(response.notes()).isEqualTo("Treatment plan follow-up");
    }

    @Test
    @DisplayName("13. Payment mapper preserves method, status, and reference safely")
    void testPaymentMapperPreservesAllMetadata() {
        Invoice invoice = new Invoice("INV-2026-004", 104L, LocalDate.now());
        invoice.setId(555L);

        LocalDateTime paidAt = LocalDateTime.of(2026, 6, 1, 14, 30, 0);
        Payment payment = new Payment(invoice, "REC-2026-004", new BigDecimal("75.00"),
                PaymentMethod.BANK_TRANSFER, "TXN-987654", paidAt, 888L);
        payment.setId(777L);
        payment.setStatus(PaymentStatus.RECORDED);
        payment.setReversalOfPaymentId(666L);
        payment.setReversalReason("Erroneous amount entered");

        PaymentResponse response = mapper.toPaymentResponse(payment);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(777L);
        assertThat(response.invoiceId()).isEqualTo(555L);
        assertThat(response.paymentNumber()).isEqualTo("REC-2026-004");
        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("75.00"));
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(response.paymentReference()).isEqualTo("TXN-987654");
        assertThat(response.paidAt()).isEqualTo(paidAt);
        assertThat(response.status()).isEqualTo(PaymentStatus.RECORDED);
        assertThat(response.reversalOfPaymentId()).isEqualTo(666L);
        assertThat(response.reversalReason()).isEqualTo("Erroneous amount entered");
        assertThat(response.recordedBy()).isEqualTo(888L);
    }

    @Test
    @DisplayName("14. ReceiptResponse mapping uses recorded payment and invoice values without recalculation")
    void testReceiptResponseUsesRecordedValuesWithoutRecalculation() {
        Invoice invoice = new Invoice("INV-2026-005", 105L, LocalDate.now());
        invoice.setId(801L);
        invoice.setTotalAmount(new BigDecimal("200.00"));
        invoice.setBalanceAmount(new BigDecimal("50.00"));

        LocalDateTime paidAt = LocalDateTime.of(2026, 7, 4, 11, 0, 0);
        Payment payment = new Payment(invoice, "REC-2026-005", new BigDecimal("150.00"),
                PaymentMethod.CARD, "SLIP-456", paidAt, 777L);
        payment.setId(901L);

        // Map via direct payment (which carries invoice reference)
        ReceiptResponse receipt = mapper.toReceiptResponse(payment);

        assertThat(receipt).isNotNull();
        assertThat(receipt.paymentId()).isEqualTo(901L);
        assertThat(receipt.paymentNumber()).isEqualTo("REC-2026-005");
        assertThat(receipt.invoiceId()).isEqualTo(801L);
        assertThat(receipt.invoiceNumber()).isEqualTo("INV-2026-005");
        assertThat(receipt.patientId()).isEqualTo(105L);
        assertThat(receipt.paymentAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(receipt.paymentMethod()).isEqualTo(PaymentMethod.CARD);
        assertThat(receipt.paymentReference()).isEqualTo("SLIP-456");
        assertThat(receipt.paidAt()).isEqualTo(paidAt);
        assertThat(receipt.invoiceTotalAmount()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(receipt.remainingBalance()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(receipt.recordedBy()).isEqualTo(777L);
    }

    @Test
    @DisplayName("15. Nullable treatment references, parent references, and reversal links map safely")
    void testNullableReferencesMapSafely() {
        // Item with null treatmentProcedureId
        InvoiceItem item = new InvoiceItem(null, null, "General Consultation", 1, new BigDecimal("30.00"), new BigDecimal("30.00"));
        InvoiceItemResponse itemResponse = mapper.toItemResponse(item);
        assertThat(itemResponse.treatmentProcedureId()).isNull();

        // Invoice with null treatmentPlanId, items, payments
        Invoice invoice = new Invoice("INV-2026-NULLS", 999L, LocalDate.now());
        invoice.setTreatmentPlanId(null);
        invoice.setItems(null);
        invoice.setPayments(null);
        invoice.setNotes(null);

        InvoiceResponse invoiceResponse = mapper.toInvoiceResponse(invoice);
        assertThat(invoiceResponse.treatmentPlanId()).isNull();
        assertThat(invoiceResponse.items()).isEmpty();
        assertThat(invoiceResponse.payments()).isEmpty();
        assertThat(invoiceResponse.notes()).isNull();

        // Payment without invoice link or reversal link
        Payment payment = new Payment(null, "REC-SOLO", new BigDecimal("10.00"), PaymentMethod.OTHER, null, LocalDateTime.now(), 1L);
        payment.setReversalOfPaymentId(null);
        payment.setReversalReason(null);

        PaymentResponse paymentResponse = mapper.toPaymentResponse(payment);
        assertThat(paymentResponse.invoiceId()).isNull();
        assertThat(paymentResponse.paymentReference()).isNull();
        assertThat(paymentResponse.reversalOfPaymentId()).isNull();
        assertThat(paymentResponse.reversalReason()).isNull();

        ReceiptResponse receiptResponse = mapper.toReceiptResponse(payment, null);
        assertThat(receiptResponse.invoiceId()).isNull();
        assertThat(receiptResponse.invoiceNumber()).isNull();
        assertThat(receiptResponse.patientId()).isNull();
        assertThat(receiptResponse.invoiceTotalAmount()).isNull();
        assertThat(receiptResponse.remainingBalance()).isNull();
    }

    @Test
    @DisplayName("Null entity mapping safely returns null")
    void testNullEntityReturnsNull() {
        assertThat(mapper.toItemResponse(null)).isNull();
        assertThat(mapper.toPaymentResponse(null)).isNull();
        assertThat(mapper.toInvoiceResponse(null)).isNull();
        assertThat(mapper.toReceiptResponse(null)).isNull();
        assertThat(mapper.toReceiptResponse(null, null)).isNull();

        assertThat(mapper.toItemResponses(null)).isEmpty();
        assertThat(mapper.toItemResponses(Collections.emptyList())).isEmpty();
        assertThat(mapper.toPaymentResponses(null)).isEmpty();
        assertThat(mapper.toPaymentResponses(Collections.emptyList())).isEmpty();
        assertThat(mapper.toInvoiceResponses(null)).isEmpty();
        assertThat(mapper.toInvoiceResponses(Collections.emptyList())).isEmpty();
    }

    @Test
    @DisplayName("IncomeSummaryResponse contract holds period and breakdown data correctly")
    void testIncomeSummaryResponseContract() {
        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);
        BigDecimal total = new BigDecimal("15450.00");
        Map<PaymentMethod, BigDecimal> breakdown = Map.of(
                PaymentMethod.CASH, new BigDecimal("5450.00"),
                PaymentMethod.CARD, new BigDecimal("10000.00")
        );

        IncomeSummaryResponse summary = new IncomeSummaryResponse(start, end, total, breakdown);

        assertThat(summary.startDate()).isEqualTo(start);
        assertThat(summary.endDate()).isEqualTo(end);
        assertThat(summary.totalIncome()).isEqualByComparingTo(total);
        assertThat(summary.breakdownByMethod()).isEqualTo(breakdown);

        // Simple constructor with default empty map
        IncomeSummaryResponse simple = new IncomeSummaryResponse(start, end, total);
        assertThat(simple.breakdownByMethod()).isEmpty();
    }
}
