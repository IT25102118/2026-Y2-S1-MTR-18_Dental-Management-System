package com.dentcare.billing.service;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.dto.ReversePaymentRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidBillingAmountException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvalidPaymentStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.OverpaymentException;
import com.dentcare.billing.exception.PaymentNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentNumberGenerator paymentNumberGenerator;

    private BillingCalculationService billingCalculationService;
    private BillingMapper billingMapper;
    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        billingCalculationService = new BillingCalculationService();
        billingMapper = new BillingMapper();
        paymentService = new PaymentServiceImpl(
                invoiceRepository,
                paymentRepository,
                billingCalculationService,
                billingMapper,
                paymentNumberGenerator
        );
    }

    private Invoice createTestInvoice(Long id, InvoiceStatus status, BigDecimal total, BigDecimal paid, BigDecimal balance) {
        Invoice invoice = new Invoice("INV-2026-" + id, 100L, LocalDate.now());
        invoice.setId(id);
        invoice.setStatus(status);
        invoice.setSubtotal(total);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setBalanceAmount(balance);
        return invoice;
    }

    // -------------------------------------------------------------------------
    // Eligibility Tests (1 - 6)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("1. Payment on UNPAID invoice is accepted")
    void testPaymentOnUnpaidAccepted() {
        Invoice invoice = createTestInvoice(1L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(1L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-001");
        when(paymentRepository.existsByPaymentNumber("REC-TEST-001")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("40.00"), PaymentMethod.CASH, "CASH-1");
        PaymentResponse response = paymentService.recordPayment(1L, request, 888L);

        assertThat(response).isNotNull();
        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("40.00"));
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
    }

    @Test
    @DisplayName("2. Payment on PARTIALLY_PAID invoice is accepted")
    void testPaymentOnPartiallyPaidAccepted() {
        Invoice invoice = createTestInvoice(2L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("40.00"), new BigDecimal("60.00"));
        when(invoiceRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(2L)).thenReturn(new BigDecimal("40.00"));
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-002");
        when(paymentRepository.existsByPaymentNumber("REC-TEST-002")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("60.00"), PaymentMethod.CARD, "CARD-2");
        PaymentResponse response = paymentService.recordPayment(2L, request, 888L);

        assertThat(response).isNotNull();
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    @DisplayName("3. Payment on DRAFT invoice is rejected with InvalidInvoiceStatusException")
    void testPaymentOnDraftRejected() {
        Invoice invoice = createTestInvoice(3L, InvoiceStatus.DRAFT, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(invoice));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH);
        assertThatThrownBy(() -> paymentService.recordPayment(3L, request, 888L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Payment can only be recorded on UNPAID or PARTIALLY_PAID invoices");
    }

    @Test
    @DisplayName("4. Payment on PAID invoice is rejected with InvalidInvoiceStatusException")
    void testPaymentOnPaidRejected() {
        Invoice invoice = createTestInvoice(4L, InvoiceStatus.PAID, new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO);
        when(invoiceRepository.findByIdForUpdate(4L)).thenReturn(Optional.of(invoice));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("10.00"), PaymentMethod.CASH);
        assertThatThrownBy(() -> paymentService.recordPayment(4L, request, 888L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Payment can only be recorded on UNPAID or PARTIALLY_PAID invoices");
    }

    @Test
    @DisplayName("5. Payment on CANCELLED invoice is rejected with InvalidInvoiceStatusException")
    void testPaymentOnCancelledRejected() {
        Invoice invoice = createTestInvoice(5L, InvoiceStatus.CANCELLED, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(invoice));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH);
        assertThatThrownBy(() -> paymentService.recordPayment(5L, request, 888L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Payment can only be recorded on UNPAID or PARTIALLY_PAID invoices");
    }

    @Test
    @DisplayName("6. Missing invoice produces InvoiceNotFoundException")
    void testMissingInvoiceThrowsNotFound() {
        when(invoiceRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH);
        assertThatThrownBy(() -> paymentService.recordPayment(999L, request, 888L))
                .isInstanceOf(InvoiceNotFoundException.class)
                .hasMessageContaining("999");
    }

    // -------------------------------------------------------------------------
    // Validation Tests (7 - 10)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("7. Zero payment amount is rejected with InvalidBillingAmountException")
    void testZeroAmountRejected() {
        RecordPaymentRequest request = new RecordPaymentRequest(BigDecimal.ZERO, PaymentMethod.CASH);

        assertThatThrownBy(() -> paymentService.recordPayment(1L, request, 888L))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("strictly greater than zero");
    }

    @Test
    @DisplayName("8. Negative payment amount is rejected with InvalidBillingAmountException")
    void testNegativeAmountRejected() {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("-15.00"), PaymentMethod.CASH);

        assertThatThrownBy(() -> paymentService.recordPayment(1L, request, 888L))
                .isInstanceOf(InvalidBillingAmountException.class)
                .hasMessageContaining("strictly greater than zero");
    }

    @Test
    @DisplayName("9. Payment exceeding remaining balance is rejected with OverpaymentException (BR-10)")
    void testOverpaymentRejected() {
        Invoice invoice = createTestInvoice(9L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(9L)).thenReturn(BigDecimal.ZERO);

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("100.01"), PaymentMethod.CARD);

        assertThatThrownBy(() -> paymentService.recordPayment(9L, request, 888L))
                .isInstanceOf(OverpaymentException.class)
                .satisfies(ex -> {
                    OverpaymentException oe = (OverpaymentException) ex;
                    assertThat(oe.getPaymentAmount()).isEqualByComparingTo(new BigDecimal("100.01"));
                    assertThat(oe.getRemainingBalance()).isEqualByComparingTo(new BigDecimal("100.00"));
                });

        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("10. Payment exactly equal to outstanding balance is accepted")
    void testExactBalancePaymentAccepted() {
        Invoice invoice = createTestInvoice(10L, InvoiceStatus.UNPAID, new BigDecimal("150.00"), BigDecimal.ZERO, new BigDecimal("150.00"));
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(10L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-010");
        when(paymentRepository.existsByPaymentNumber("REC-TEST-010")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("150.00"), PaymentMethod.BANK_TRANSFER);
        PaymentResponse response = paymentService.recordPayment(10L, request, 888L);

        assertThat(response).isNotNull();
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // -------------------------------------------------------------------------
    // Partial and Full Payment Flows (11 - 19)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("11. UNPAID + partial payment transitions invoice to PARTIALLY_PAID")
    void testUnpaidToPartiallyPaid() {
        Invoice invoice = createTestInvoice(11L, InvoiceStatus.UNPAID, new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("200.00"));
        when(invoiceRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(11L)).thenReturn(null); // null SUM
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-011");
        when(paymentRepository.existsByPaymentNumber("REC-TEST-011")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("75.00"), PaymentMethod.CASH, "COUNTER-SLIP-1");
        PaymentResponse response = paymentService.recordPayment(11L, request, 777L);

        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("75.00"));
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
    }

    @Test
    @DisplayName("12. Invoice paidAmount is updated correctly to match cumulative payments")
    void testPaidAmountUpdatedCorrectly() {
        Invoice invoice = createTestInvoice(12L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(12L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-012");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(12L, new RecordPaymentRequest(new BigDecimal("35.00"), PaymentMethod.CASH), 1L);

        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("35.00"));
    }

    @Test
    @DisplayName("13. Invoice balance is updated correctly to total - cumulative paid")
    void testBalanceUpdatedCorrectly() {
        Invoice invoice = createTestInvoice(13L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(13L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-013");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(13L, new RecordPaymentRequest(new BigDecimal("35.00"), PaymentMethod.CASH), 1L);

        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("65.00"));
    }

    @Test
    @DisplayName("14. Payment entity is persisted with status RECORDED")
    void testPaymentPersistedWithRecordedStatus() {
        Invoice invoice = createTestInvoice(14L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(14L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(14L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-014");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(14L, new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH), 1L);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        Payment saved = captor.getValue();

        assertThat(saved.getStatus()).isEqualTo(PaymentStatus.RECORDED);
    }

    @Test
    @DisplayName("15. PaymentMethod from request is preserved exactly")
    void testPaymentMethodPreserved() {
        Invoice invoice = createTestInvoice(15L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(15L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(15L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-015");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(15L, new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.BANK_TRANSFER), 1L);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
    }

    @Test
    @DisplayName("16. Optional non-sensitive payment reference is preserved")
    void testPaymentReferencePreserved() {
        Invoice invoice = createTestInvoice(16L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(16L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(16L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-016");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(16L, new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CARD, "TERMINAL-AUTH-999"), 1L);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getPaymentReference()).isEqualTo("TERMINAL-AUTH-999");
    }

    @Test
    @DisplayName("17. Trusted recordedBy comes from server argument, not client request")
    void testRecordedByComesFromTrustedContext() {
        Invoice invoice = createTestInvoice(17L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(17L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-017");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        Long trustedUserId = 4321L;
        paymentService.recordPayment(17L, new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH), trustedUserId);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        assertThat(captor.getValue().getRecordedBy()).isEqualTo(trustedUserId);
    }

    @Test
    @DisplayName("18. Full payment transitions invoice to PAID status")
    void testFullPaymentTransitionsToPaid() {
        Invoice invoice = createTestInvoice(18L, InvoiceStatus.UNPAID, new BigDecimal("250.00"), BigDecimal.ZERO, new BigDecimal("250.00"));
        when(invoiceRepository.findByIdForUpdate(18L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(18L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-018");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.recordPayment(18L, new RecordPaymentRequest(new BigDecimal("250.00"), PaymentMethod.CASH), 1L);

        assertThat(response).isNotNull();
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    @DisplayName("19. Full payment results in numeric zero balance")
    void testFullPaymentResultsInZeroBalance() {
        Invoice invoice = createTestInvoice(19L, InvoiceStatus.UNPAID, new BigDecimal("120.00"), BigDecimal.ZERO, new BigDecimal("120.00"));
        when(invoiceRepository.findByIdForUpdate(19L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(19L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-019");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(19L, new RecordPaymentRequest(new BigDecimal("120.00"), PaymentMethod.CASH), 1L);

        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
    }

    // -------------------------------------------------------------------------
    // Multiple Payments & History Integrity (20 - 23)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("20. Authoritative recorded payments SUM is used rather than relying on potentially stale invoice fields")
    void testAuthoritativePriorSumUsed() {
        // Suppose invoice entity has stale paidAmount = 0, but PaymentRepository SUM = 40.00
        Invoice invoice = createTestInvoice(20L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(20L)).thenReturn(new BigDecimal("40.00"));
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-020");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        // Attempting to pay 60.00 should succeed (40 + 60 = 100) and transition to PAID
        paymentService.recordPayment(20L, new RecordPaymentRequest(new BigDecimal("60.00"), PaymentMethod.CARD), 1L);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("21. REVERSED payments are excluded from authoritative sum via repository query specification")
    void testReversedPaymentsExcludedFromAuthoritativeSum() {
        Invoice invoice = createTestInvoice(21L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(invoice));
        // Repository SUM excludes REVERSED, returning only active RECORDED sum (e.g. 0 even if a reversed payment exists)
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(21L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-021");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(21L, new RecordPaymentRequest(new BigDecimal("100.00"), PaymentMethod.CASH), 1L);

        verify(paymentRepository).sumRecordedPaymentsByInvoiceId(21L);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    @DisplayName("22. Final partial payment reaches PAID status when remaining balance becomes zero")
    void testFinalPaymentReachesPaid() {
        Invoice invoice = createTestInvoice(22L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("70.00"), new BigDecimal("30.00"));
        when(invoiceRepository.findByIdForUpdate(22L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(22L)).thenReturn(new BigDecimal("70.00"));
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-022");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(22L, new RecordPaymentRequest(new BigDecimal("30.00"), PaymentMethod.CASH), 1L);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("23. Existing payments remain queryable and are never deleted")
    void testExistingPaymentsQueryableNotDeleted() {
        Invoice invoice = createTestInvoice(23L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment p1 = new Payment(invoice, "REC-01", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        p1.setId(101L);
        p1.setStatus(PaymentStatus.RECORDED);

        Payment p2 = new Payment(invoice, "REC-02", new BigDecimal("20.00"), PaymentMethod.CARD, null, LocalDateTime.now(), 1L);
        p2.setId(102L);
        p2.setStatus(PaymentStatus.REVERSED);

        when(invoiceRepository.existsById(23L)).thenReturn(true);
        when(paymentRepository.findByInvoiceIdOrderByPaidAtAscIdAsc(23L)).thenReturn(List.of(p1, p2));

        List<PaymentResponse> history = paymentService.getPaymentsForInvoice(23L);

        assertThat(history).hasSize(2);
        assertThat(history.get(0).status()).isEqualTo(PaymentStatus.RECORDED);
        assertThat(history.get(1).status()).isEqualTo(PaymentStatus.REVERSED);
    }

    // -------------------------------------------------------------------------
    // Concurrency & Atomicity (24 - 26)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("24. State-changing payment workflow uses findByIdForUpdate locking path")
    void testLockingPathUsedForPayment() {
        Invoice invoice = createTestInvoice(24L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(24L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(24L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-024");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.recordPayment(24L, new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH), 1L);

        verify(invoiceRepository).findByIdForUpdate(24L);
    }

    @Test
    @DisplayName("25. Validation failure occurs before Payment save is ever called")
    void testValidationFailureOccursBeforePaymentSave() {
        Invoice invoice = createTestInvoice(25L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(25L)).thenReturn(BigDecimal.ZERO);

        // Overpayment attempt
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("150.00"), PaymentMethod.CASH);

        assertThatThrownBy(() -> paymentService.recordPayment(25L, request, 1L))
                .isInstanceOf(OverpaymentException.class);

        verify(paymentRepository, never()).save(any());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    @DisplayName("26. Repository failure propagates instead of being masked")
    void testRepositoryFailurePropagates() {
        Invoice invoice = createTestInvoice(26L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(26L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(26L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-026");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenThrow(new RuntimeException("Database connectivity lost"));

        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH);

        assertThatThrownBy(() -> paymentService.recordPayment(26L, request, 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database connectivity lost");
    }

    // -------------------------------------------------------------------------
    // Precision (27)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("27. Payment amounts and balances are normalized to two decimal places")
    void testPrecisionPreservation() {
        BigDecimal total = new BigDecimal("100.555");
        BigDecimal paymentAmt = new BigDecimal("40.222");
        BigDecimal expectedBalance = new BigDecimal("60.34");

        Invoice invoice = createTestInvoice(27L, InvoiceStatus.UNPAID, total, BigDecimal.ZERO, total);
        when(invoiceRepository.findByIdForUpdate(27L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(27L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-027");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.recordPayment(27L, new RecordPaymentRequest(paymentAmt, PaymentMethod.CASH), 1L);

        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("40.22"));
        assertThat(response.amount().scale()).isEqualTo(2);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("40.22"));
        assertThat(invoice.getPaidAmount().scale()).isEqualTo(2);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(expectedBalance);
        assertThat(invoice.getBalanceAmount().scale()).isEqualTo(2);
    }

    // -------------------------------------------------------------------------
    // Payment Reversal Tests (28 - 45)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("28. Controlled reversal of RECORDED payment succeeds and recalculates invoice to UNPAID")
    void testReverseRecordedPaymentSuccess() {
        Invoice invoice = createTestInvoice(28L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment originalPayment = new Payment(invoice, "REC-2026-00028", new BigDecimal("50.00"), PaymentMethod.CASH, "REF-28", LocalDateTime.now().minusDays(1), 10L);
        originalPayment.setId(280L);
        originalPayment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(280L)).thenReturn(Optional.of(originalPayment));
        when(paymentRepository.existsByReversalOfPaymentId(280L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(28L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-2026-00028-REV");
        when(paymentRepository.existsByPaymentNumber("REC-2026-00028-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(28L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.reversePayment(280L, "Duplicate cash entry", 99L);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(PaymentStatus.REVERSED);
        assertThat(response.reversalOfPaymentId()).isEqualTo(280L);
        assertThat(response.reversalReason()).isEqualTo("Duplicate cash entry");
        assertThat(response.recordedBy()).isEqualTo(99L);
        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("50.00"));

        // Verify original payment state updated to REVERSED
        assertThat(originalPayment.getStatus()).isEqualTo(PaymentStatus.REVERSED);
        assertThat(originalPayment.getReversalReason()).isEqualTo("Duplicate cash entry");

        // Verify invoice recalculated to UNPAID
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.UNPAID);
    }

    @Test
    @DisplayName("29. Reverse payment via ReversePaymentRequest DTO succeeds")
    void testReversePaymentViaRequestDtoSuccess() {
        Invoice invoice = createTestInvoice(29L, InvoiceStatus.PAID, new BigDecimal("80.00"), new BigDecimal("80.00"), BigDecimal.ZERO);
        Payment originalPayment = new Payment(invoice, "REC-2026-00029", new BigDecimal("80.00"), PaymentMethod.CARD, "TXN-29", LocalDateTime.now(), 10L);
        originalPayment.setId(290L);
        originalPayment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(290L)).thenReturn(Optional.of(originalPayment));
        when(paymentRepository.existsByReversalOfPaymentId(290L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(29L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-2026-00029-REV");
        when(paymentRepository.existsByPaymentNumber("REC-2026-00029-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(29L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        ReversePaymentRequest request = new ReversePaymentRequest("Card chargeback requested by patient");
        PaymentResponse response = paymentService.reversePayment(290L, request, 77L);

        assertThat(response).isNotNull();
        assertThat(response.reversalReason()).isEqualTo("Card chargeback requested by patient");
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.UNPAID);
    }

    @Test
    @DisplayName("30. Reversing nonexistent payment throws PaymentNotFoundException")
    void testReverseNonexistentPaymentThrowsNotFound() {
        when(paymentRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.reversePayment(999L, "Reason", 1L))
                .isInstanceOf(PaymentNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("31. Reversing with null payment ID throws BillingValidationException")
    void testReverseNullPaymentIdThrowsValidation() {
        assertThatThrownBy(() -> paymentService.reversePayment(null, "Reason", 1L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Payment ID is required");
    }

    @Test
    @DisplayName("32. Reversing with null, empty, or blank reason throws BillingValidationException")
    void testReverseBlankReasonThrowsValidation() {
        assertThatThrownBy(() -> paymentService.reversePayment(1L, (String) null, 1L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Reversal reason is required");

        assertThatThrownBy(() -> paymentService.reversePayment(1L, "", 1L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Reversal reason is required");

        assertThatThrownBy(() -> paymentService.reversePayment(1L, "   ", 1L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Reversal reason is required");
    }

    @Test
    @DisplayName("33. Reversing with null reversedByUserId throws BillingValidationException")
    void testReverseNullUserIdThrowsValidation() {
        assertThatThrownBy(() -> paymentService.reversePayment(1L, "Valid reason", null))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Reversed by user ID is required");
    }

    @Test
    @DisplayName("34. Reversing with null ReversePaymentRequest throws BillingValidationException")
    void testReverseNullRequestDtoThrowsValidation() {
        assertThatThrownBy(() -> paymentService.reversePayment(1L, (ReversePaymentRequest) null, 1L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Reverse payment request is required");
    }

    @Test
    @DisplayName("35. Reversing already REVERSED payment throws InvalidPaymentStatusException")
    void testReverseAlreadyReversedPaymentThrowsInvalidPaymentStatus() {
        Invoice invoice = createTestInvoice(35L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        Payment alreadyReversed = new Payment(invoice, "REC-35", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        alreadyReversed.setId(350L);
        alreadyReversed.setStatus(PaymentStatus.REVERSED);

        when(paymentRepository.findByIdForUpdate(350L)).thenReturn(Optional.of(alreadyReversed));

        assertThatThrownBy(() -> paymentService.reversePayment(350L, "Attempt another reversal", 1L))
                .isInstanceOf(InvalidPaymentStatusException.class)
                .hasMessageContaining("Only RECORDED payments can be reversed");
    }

    @Test
    @DisplayName("36. Duplicate reversal detection via existsByReversalOfPaymentId throws InvalidPaymentStatusException")
    void testReverseDuplicateReversalDetectedThrowsInvalidPaymentStatus() {
        Invoice invoice = createTestInvoice(36L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment payment = new Payment(invoice, "REC-36", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        payment.setId(360L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(360L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(360L)).thenReturn(true);

        assertThatThrownBy(() -> paymentService.reversePayment(360L, "Duplicate attempt", 1L))
                .isInstanceOf(InvalidPaymentStatusException.class)
                .hasMessageContaining("already been reversed");
    }

    @Test
    @DisplayName("37. Reversing payment with null invoice reference throws BillingValidationException")
    void testReversePaymentWithNullInvoiceThrowsValidation() {
        Payment payment = new Payment(null, "REC-37", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        payment.setId(370L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(370L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(370L)).thenReturn(false);

        assertThatThrownBy(() -> paymentService.reversePayment(370L, "Valid reason", 1L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Payment is not associated with a valid invoice");
    }

    @Test
    @DisplayName("38. Reversing payment when invoice cannot be found for update throws InvoiceNotFoundException")
    void testReversePaymentInvoiceNotFoundDuringLockThrowsNotFound() {
        Invoice invoice = createTestInvoice(38L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment payment = new Payment(invoice, "REC-38", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        payment.setId(380L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(380L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(380L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(38L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.reversePayment(380L, "Valid reason", 1L))
                .isInstanceOf(InvoiceNotFoundException.class)
                .hasMessageContaining("38");
    }

    @Test
    @DisplayName("39. Financial history preservation: original payment record is never deleted and fields are preserved")
    void testHistoryPreservationNeverDeletes() {
        Invoice invoice = createTestInvoice(39L, InvoiceStatus.PAID, new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO);
        LocalDateTime originalPaidAt = LocalDateTime.of(2026, 3, 1, 10, 30);
        Payment originalPayment = new Payment(invoice, "REC-2026-00039", new BigDecimal("100.00"), PaymentMethod.BANK_TRANSFER, "REF-TXN-39", originalPaidAt, 42L);
        originalPayment.setId(390L);
        originalPayment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(390L)).thenReturn(Optional.of(originalPayment));
        when(paymentRepository.existsByReversalOfPaymentId(390L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(39L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-2026-00039-REV");
        when(paymentRepository.existsByPaymentNumber("REC-2026-00039-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(39L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.reversePayment(390L, "Reversing bank transfer", 99L);

        // Verify original payment historical attributes remain untouched except status and reversalReason
        assertThat(originalPayment.getAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(originalPayment.getPaymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(originalPayment.getPaymentReference()).isEqualTo("REF-TXN-39");
        assertThat(originalPayment.getPaidAt()).isEqualTo(originalPaidAt);
        assertThat(originalPayment.getRecordedBy()).isEqualTo(42L);

        // Verify ArgumentCaptor captures both original and reversal saves
        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository, org.mockito.Mockito.times(2)).save(paymentCaptor.capture());
        List<Payment> savedPayments = paymentCaptor.getAllValues();

        Payment savedOriginal = savedPayments.get(0);
        Payment savedReversal = savedPayments.get(1);

        assertThat(savedOriginal.getId()).isEqualTo(390L);
        assertThat(savedOriginal.getStatus()).isEqualTo(PaymentStatus.REVERSED);

        assertThat(savedReversal.getReversalOfPaymentId()).isEqualTo(390L);
        assertThat(savedReversal.getStatus()).isEqualTo(PaymentStatus.REVERSED);
        assertThat(savedReversal.getRecordedBy()).isEqualTo(99L);
        assertThat(savedReversal.getPaymentNumber()).isEqualTo("REC-2026-00039-REV");
    }

    @Test
    @DisplayName("40. Reversal of one of multiple payments transitions invoice from PAID to PARTIALLY_PAID")
    void testReverseOneOfMultiplePaymentsOnPaidInvoiceTransitionsToPartiallyPaid() {
        Invoice invoice = createTestInvoice(40L, InvoiceStatus.PAID, new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO);
        Payment payment2 = new Payment(invoice, "REC-40-2", new BigDecimal("40.00"), PaymentMethod.CARD, "TXN-402", LocalDateTime.now(), 5L);
        payment2.setId(402L);
        payment2.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(402L)).thenReturn(Optional.of(payment2));
        when(paymentRepository.existsByReversalOfPaymentId(402L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(40L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-40-REV");
        when(paymentRepository.existsByPaymentNumber("REC-40-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        // Remaining active payment #1 is 60.00
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(40L)).thenReturn(new BigDecimal("60.00"));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.reversePayment(402L, "Card payment reversed", 12L);

        assertThat(response).isNotNull();
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("60.00"));
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("40.00"));
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
    }

    @Test
    @DisplayName("41. Reversal of payment on PARTIALLY_PAID invoice retains PARTIALLY_PAID when remaining balance > 0 and paid > 0")
    void testReversePaymentRetainsPartiallyPaidWhenOtherPaymentsExist() {
        Invoice invoice = createTestInvoice(41L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("200.00"), new BigDecimal("80.00"), new BigDecimal("120.00"));
        Payment payment = new Payment(invoice, "REC-41", new BigDecimal("30.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 5L);
        payment.setId(410L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(410L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(410L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-41-REV");
        when(paymentRepository.existsByPaymentNumber("REC-41-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        // 80 - 30 = 50 remaining recorded
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(41L)).thenReturn(new BigDecimal("50.00"));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.reversePayment(410L, "Correction", 12L);

        assertThat(response).isNotNull();
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
    }

    @Test
    @DisplayName("42. Reversal on CANCELLED invoice preserves CANCELLED status")
    void testReverseOnCancelledInvoicePreservesStatus() {
        Invoice invoice = createTestInvoice(42L, InvoiceStatus.CANCELLED, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment payment = new Payment(invoice, "REC-42", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 5L);
        payment.setId(420L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(420L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(420L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-42-REV");
        when(paymentRepository.existsByPaymentNumber("REC-42-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(42L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.reversePayment(420L, "Correction after cancellation", 12L);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("43. Reversal uses pessimistic locking path findByIdForUpdate")
    void testReverseUsesPessimisticLocking() {
        Invoice invoice = createTestInvoice(43L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment payment = new Payment(invoice, "REC-43", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 5L);
        payment.setId(430L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(430L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(430L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(43L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-43-REV");
        when(paymentRepository.existsByPaymentNumber("REC-43-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(43L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        paymentService.reversePayment(430L, "Lock test", 1L);

        var lockOrder = inOrder(paymentRepository, invoiceRepository);
        lockOrder.verify(paymentRepository).findByIdForUpdate(430L);
        lockOrder.verify(paymentRepository).existsByReversalOfPaymentId(430L);
        lockOrder.verify(invoiceRepository).findByIdForUpdate(43L);
    }

    @Test
    @DisplayName("44. Repository failure during reversal propagates cleanly without masking")
    void testReverseRepositoryFailurePropagates() {
        Invoice invoice = createTestInvoice(44L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("100.00"), new BigDecimal("50.00"), new BigDecimal("50.00"));
        Payment payment = new Payment(invoice, "REC-44", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 5L);
        payment.setId(440L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(440L)).thenReturn(Optional.of(payment));
        when(paymentRepository.existsByReversalOfPaymentId(440L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(44L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.save(any(Payment.class))).thenThrow(new RuntimeException("Database write failure"));

        assertThatThrownBy(() -> paymentService.reversePayment(440L, "Fail test", 1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database write failure");
    }

    @Test
    @DisplayName("45. Payment reversal normalizes recalculated invoice amounts to two decimals")
    void testReversePreservesBigDecimalPrecision() {
        BigDecimal total = new BigDecimal("150.333");
        BigDecimal pay1 = new BigDecimal("50.111");
        BigDecimal pay2 = new BigDecimal("100.222");

        Invoice invoice = createTestInvoice(45L, InvoiceStatus.PAID, total, total, BigDecimal.ZERO);
        Payment payment2 = new Payment(invoice, "REC-45-2", pay2, PaymentMethod.CARD, "TXN-45", LocalDateTime.now(), 1L);
        payment2.setId(452L);
        payment2.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findByIdForUpdate(452L)).thenReturn(Optional.of(payment2));
        when(paymentRepository.existsByReversalOfPaymentId(452L)).thenReturn(false);
        when(invoiceRepository.findByIdForUpdate(45L)).thenReturn(Optional.of(invoice));
        when(paymentNumberGenerator.generate()).thenReturn("REC-45-REV");
        when(paymentRepository.existsByPaymentNumber("REC-45-REV")).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        when(paymentRepository.sumRecordedPaymentsByInvoiceId(45L)).thenReturn(pay1);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.reversePayment(452L, "Precision test", 1L);

        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("100.22"));
        assertThat(response.amount().scale()).isEqualTo(2);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(new BigDecimal("50.11"));
        assertThat(invoice.getPaidAmount().scale()).isEqualTo(2);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("100.22"));
        assertThat(invoice.getBalanceAmount().scale()).isEqualTo(2);
    }
}
