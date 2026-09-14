package com.dentcare.billing.service;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.InvalidBillingAmountException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.OverpaymentException;
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
    @DisplayName("27. BigDecimal calculations preserve numeric precision without forced setScale/rounding")
    void testPrecisionPreservation() {
        BigDecimal total = new BigDecimal("100.555");
        BigDecimal paymentAmt = new BigDecimal("40.222");
        BigDecimal expectedBalance = new BigDecimal("60.333");

        Invoice invoice = createTestInvoice(27L, InvoiceStatus.UNPAID, total, BigDecimal.ZERO, total);
        when(invoiceRepository.findByIdForUpdate(27L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(27L)).thenReturn(BigDecimal.ZERO);
        when(paymentNumberGenerator.generate()).thenReturn("REC-TEST-027");
        when(paymentRepository.existsByPaymentNumber(anyString())).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.recordPayment(27L, new RecordPaymentRequest(paymentAmt, PaymentMethod.CASH), 1L);

        assertThat(response.amount()).isEqualByComparingTo(paymentAmt);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(paymentAmt);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(expectedBalance);
    }
}
