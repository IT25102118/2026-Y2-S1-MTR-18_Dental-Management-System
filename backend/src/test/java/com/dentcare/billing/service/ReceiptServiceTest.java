package com.dentcare.billing.service;

import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.PaymentNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceiptServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    private BillingMapper billingMapper;
    private ReceiptServiceImpl receiptService;

    @BeforeEach
    void setUp() {
        billingMapper = new BillingMapper();
        receiptService = new ReceiptServiceImpl(paymentRepository, invoiceRepository, billingMapper);
    }

    private Invoice createTestInvoice(Long id, BigDecimal total, BigDecimal balance) {
        Invoice invoice = new Invoice("INV-2026-" + id, 100L + id, LocalDate.now());
        invoice.setId(id);
        invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        invoice.setSubtotal(total);
        invoice.setTotalAmount(total);
        invoice.setBalanceAmount(balance);
        invoice.setPaidAmount(total.subtract(balance));
        return invoice;
    }

    private Payment createTestPayment(Long id, Invoice invoice, BigDecimal amount, PaymentMethod method, String ref, PaymentStatus status) {
        Payment payment = new Payment(invoice, "REC-2026-" + id, amount, method, ref, LocalDateTime.of(2026, 8, 15, 10, 30), 42L);
        payment.setId(id);
        payment.setStatus(status);
        return payment;
    }

    @Test
    @DisplayName("1. Receipt generation for existing RECORDED payment succeeds")
    void testReceiptForRecordedPaymentSucceeds() {
        Invoice invoice = createTestInvoice(1L, new BigDecimal("100.00"), new BigDecimal("60.00"));
        Payment payment = createTestPayment(10L, invoice, new BigDecimal("40.00"), PaymentMethod.CASH, "REF-001", PaymentStatus.RECORDED);

        when(paymentRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(1L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(10L);

        assertThat(response).isNotNull();
        assertThat(response.paymentId()).isEqualTo(10L);
        assertThat(response.paymentNumber()).isEqualTo("REC-2026-10");
        assertThat(response.invoiceId()).isEqualTo(1L);
        assertThat(response.invoiceNumber()).isEqualTo("INV-2026-1");
        assertThat(response.patientId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("2. Missing payment produces PaymentNotFoundException")
    void testMissingPaymentThrowsNotFound() {
        when(paymentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> receiptService.getReceiptForPayment(999L))
                .isInstanceOf(PaymentNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("3. Receipt contains payment ID and payment number accurately")
    void testReceiptContainsPaymentIdAndNumber() {
        Invoice invoice = createTestInvoice(2L, new BigDecimal("200.00"), new BigDecimal("150.00"));
        Payment payment = createTestPayment(20L, invoice, new BigDecimal("50.00"), PaymentMethod.CARD, "CARD-POS-99", PaymentStatus.RECORDED);

        when(paymentRepository.findById(20L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(2L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(20L);

        assertThat(response.paymentId()).isEqualTo(20L);
        assertThat(response.paymentNumber()).isEqualTo("REC-2026-20");
    }

    @Test
    @DisplayName("4. Receipt contains invoice ID and invoice number accurately")
    void testReceiptContainsInvoiceIdAndNumber() {
        Invoice invoice = createTestInvoice(3L, new BigDecimal("300.00"), new BigDecimal("200.00"));
        Payment payment = createTestPayment(30L, invoice, new BigDecimal("100.00"), PaymentMethod.BANK_TRANSFER, "TXN-30", PaymentStatus.RECORDED);

        when(paymentRepository.findById(30L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(3L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(30L);

        assertThat(response.invoiceId()).isEqualTo(3L);
        assertThat(response.invoiceNumber()).isEqualTo("INV-2026-3");
    }

    @Test
    @DisplayName("5. Receipt payment amount strictly matches persisted payment amount")
    void testReceiptAmountMatchesPersistedPaymentAmount() {
        Invoice invoice = createTestInvoice(4L, new BigDecimal("100.00"), new BigDecimal("25.00"));
        Payment payment = createTestPayment(40L, invoice, new BigDecimal("75.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(40L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(4L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(40L);

        assertThat(response.paymentAmount()).isEqualByComparingTo(new BigDecimal("75.00"));
    }

    @Test
    @DisplayName("6. Payment method is preserved on receipt")
    void testPaymentMethodPreserved() {
        Invoice invoice = createTestInvoice(5L, new BigDecimal("150.00"), new BigDecimal("50.00"));
        Payment payment = createTestPayment(50L, invoice, new BigDecimal("100.00"), PaymentMethod.OTHER, "CHEQUE-50", PaymentStatus.RECORDED);

        when(paymentRepository.findById(50L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(5L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(50L);

        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.OTHER);
    }

    @Test
    @DisplayName("7. Payment reference is preserved on receipt")
    void testPaymentReferencePreserved() {
        Invoice invoice = createTestInvoice(6L, new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment = createTestPayment(60L, invoice, new BigDecimal("100.00"), PaymentMethod.CARD, "SLIP-AUTH-7788", PaymentStatus.RECORDED);

        when(paymentRepository.findById(60L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(6L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(60L);

        assertThat(response.paymentReference()).isEqualTo("SLIP-AUTH-7788");
    }

    @Test
    @DisplayName("8. Paid timestamp paidAt is preserved on receipt")
    void testPaidAtPreserved() {
        Invoice invoice = createTestInvoice(7L, new BigDecimal("100.00"), BigDecimal.ZERO);
        LocalDateTime paidAt = LocalDateTime.of(2026, 9, 1, 14, 15);
        Payment payment = new Payment(invoice, "REC-2026-70", new BigDecimal("100.00"), PaymentMethod.CASH, null, paidAt, 88L);
        payment.setId(70L);

        when(paymentRepository.findById(70L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(7L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(70L);

        assertThat(response.paidAt()).isEqualTo(paidAt);
    }

    @Test
    @DisplayName("9. Staff user ID recordedBy is preserved on receipt")
    void testRecordedByPreserved() {
        Invoice invoice = createTestInvoice(8L, new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment = new Payment(invoice, "REC-2026-80", new BigDecimal("100.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 456L);
        payment.setId(80L);

        when(paymentRepository.findById(80L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(8L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(80L);

        assertThat(response.recordedBy()).isEqualTo(456L);
    }

    @Test
    @DisplayName("10. Invoice total amount is preserved on receipt")
    void testInvoiceTotalAmountPreserved() {
        Invoice invoice = createTestInvoice(9L, new BigDecimal("250.00"), new BigDecimal("150.00"));
        Payment payment = createTestPayment(90L, invoice, new BigDecimal("100.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(90L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(90L);

        assertThat(response.invoiceTotalAmount()).isEqualByComparingTo(new BigDecimal("250.00"));
    }

    @Test
    @DisplayName("11. Remaining invoice balance is preserved on receipt")
    void testRemainingBalancePreserved() {
        Invoice invoice = createTestInvoice(10L, new BigDecimal("300.00"), new BigDecimal("120.00"));
        Payment payment = createTestPayment(100L, invoice, new BigDecimal("80.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(100L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(100L);

        assertThat(response.remainingBalance()).isEqualByComparingTo(new BigDecimal("120.00"));
    }

    @Test
    @DisplayName("12. Patient ID is preserved on receipt")
    void testPatientIdPreserved() {
        Invoice invoice = createTestInvoice(11L, new BigDecimal("100.00"), BigDecimal.ZERO);
        invoice.setPatientId(555L);
        Payment payment = createTestPayment(110L, invoice, new BigDecimal("100.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(110L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(11L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(110L);

        assertThat(response.patientId()).isEqualTo(555L);
    }

    @Test
    @DisplayName("13. BigDecimal financial fields preserve exact precision without forced rounding")
    void testBigDecimalPrecisionPreserved() {
        BigDecimal total = new BigDecimal("123.456");
        BigDecimal balance = new BigDecimal("73.234");
        BigDecimal amount = new BigDecimal("50.222");

        Invoice invoice = createTestInvoice(12L, total, balance);
        Payment payment = createTestPayment(120L, invoice, amount, PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(120L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(12L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(120L);

        assertThat(response.paymentAmount()).isEqualByComparingTo(amount);
        assertThat(response.invoiceTotalAmount()).isEqualByComparingTo(total);
        assertThat(response.remainingBalance()).isEqualByComparingTo(balance);
    }

    @Test
    @DisplayName("14. Read operation performs no save or delete repository calls")
    void testPureReadOperationNoMutations() {
        Invoice invoice = createTestInvoice(13L, new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment = createTestPayment(130L, invoice, new BigDecimal("100.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(130L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(13L)).thenReturn(Optional.of(invoice));

        receiptService.getReceiptForPayment(130L);

        verify(paymentRepository, never()).save(any());
        verify(paymentRepository, never()).delete(any());
        verify(paymentRepository, never()).deleteById(any());
        verify(invoiceRepository, never()).save(any());
        verify(invoiceRepository, never()).delete(any());
        verify(invoiceRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("15. Receipt retrieval does not mutate Payment entity state")
    void testRetrievalDoesNotMutatePayment() {
        Invoice invoice = createTestInvoice(14L, new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment = createTestPayment(140L, invoice, new BigDecimal("100.00"), PaymentMethod.CARD, "REF-14", PaymentStatus.RECORDED);

        when(paymentRepository.findById(140L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(14L)).thenReturn(Optional.of(invoice));

        receiptService.getReceiptForPayment(140L);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.RECORDED);
        assertThat(payment.getAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(payment.getPaymentReference()).isEqualTo("REF-14");
    }

    @Test
    @DisplayName("16. Receipt retrieval does not mutate Invoice entity state")
    void testRetrievalDoesNotMutateInvoice() {
        Invoice invoice = createTestInvoice(15L, new BigDecimal("200.00"), new BigDecimal("100.00"));
        Payment payment = createTestPayment(150L, invoice, new BigDecimal("100.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(150L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(15L)).thenReturn(Optional.of(invoice));

        receiptService.getReceiptForPayment(150L);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(invoice.getTotalAmount()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("17. Historical receipt for REVERSED payment is retrievable preserving financial audit history")
    void testReceiptForReversedPaymentPreserved() {
        Invoice invoice = createTestInvoice(16L, new BigDecimal("100.00"), new BigDecimal("100.00"));
        Payment reversedPayment = createTestPayment(160L, invoice, new BigDecimal("50.00"), PaymentMethod.CASH, "REV-REF", PaymentStatus.REVERSED);
        reversedPayment.setReversalReason("Entered twice by accident");

        when(paymentRepository.findById(160L)).thenReturn(Optional.of(reversedPayment));
        when(invoiceRepository.findById(16L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(160L);

        assertThat(response).isNotNull();
        assertThat(response.paymentId()).isEqualTo(160L);
        assertThat(response.paymentAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("18. Null paymentReference is handled safely without NPE")
    void testNullPaymentReferenceHandledSafely() {
        Invoice invoice = createTestInvoice(17L, new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment = createTestPayment(170L, invoice, new BigDecimal("100.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(170L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(17L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(170L);

        assertThat(response.paymentReference()).isNull();
    }

    @Test
    @DisplayName("19. Null payment ID throws BillingValidationException")
    void testNullPaymentIdThrowsValidation() {
        assertThatThrownBy(() -> receiptService.getReceiptForPayment(null))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Payment ID is required");
    }

    @Test
    @DisplayName("20. Payment with null invoice reference throws BillingValidationException")
    void testPaymentWithNullInvoiceThrowsValidation() {
        Payment payment = new Payment(null, "REC-2026-999", new BigDecimal("100.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        payment.setId(999L);

        when(paymentRepository.findById(999L)).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> receiptService.getReceiptForPayment(999L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Payment is not associated with a valid invoice");
    }

    @Test
    @DisplayName("21. Missing parent invoice in repository throws InvoiceNotFoundException")
    void testMissingParentInvoiceThrowsNotFound() {
        Invoice invoice = new Invoice("INV-2026-999", 100L, LocalDate.now());
        invoice.setId(999L);
        Payment payment = createTestPayment(180L, invoice, new BigDecimal("50.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);

        when(paymentRepository.findById(180L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> receiptService.getReceiptForPayment(180L))
                .isInstanceOf(InvoiceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("22. Receipt mapping avoids recursive JPA entity references")
    void testReceiptMappingAvoidsRecursion() {
        Invoice invoice = createTestInvoice(19L, new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment = createTestPayment(190L, invoice, new BigDecimal("100.00"), PaymentMethod.CASH, null, PaymentStatus.RECORDED);
        invoice.getPayments().add(payment);

        when(paymentRepository.findById(190L)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(19L)).thenReturn(Optional.of(invoice));

        ReceiptResponse response = receiptService.getReceiptForPayment(190L);

        // Verify response contains only pure data scalar fields and no circular object graph
        assertThat(response).isInstanceOf(ReceiptResponse.class);
        assertThat(response.paymentId()).isEqualTo(190L);
        assertThat(response.invoiceId()).isEqualTo(19L);
    }
}
