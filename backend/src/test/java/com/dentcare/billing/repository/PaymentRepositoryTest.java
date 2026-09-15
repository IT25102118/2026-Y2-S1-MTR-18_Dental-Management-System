package com.dentcare.billing.repository;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-billing.sql")
class PaymentRepositoryTest {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("retrieve chronological payment history for an invoice")
    void testFindByInvoiceIdOrderByPaidAtAsc() {
        Invoice invoice = new Invoice("INV-2026-0301", 401L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        Payment pay1 = new Payment(savedInvoice, "REC-2026-0301", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.of(2026, 9, 10, 9, 0), 1L);
        Payment pay2 = new Payment(savedInvoice, "REC-2026-0302", new BigDecimal("70.00"), PaymentMethod.CARD, null, LocalDateTime.of(2026, 9, 10, 11, 0), 1L);
        entityManager.persist(pay2);
        entityManager.persist(pay1);
        entityManager.flush();

        List<Payment> history = paymentRepository.findByInvoiceIdOrderByPaidAtAscIdAsc(savedInvoice.getId());
        assertThat(history).hasSize(2);
        assertThat(history.get(0).getPaymentNumber()).isEqualTo("REC-2026-0301");
        assertThat(history.get(1).getPaymentNumber()).isEqualTo("REC-2026-0302");
    }

    @Test
    @DisplayName("distinguish between RECORDED and REVERSED payments for an invoice")
    void testDistinguishRecordedAndReversed() {
        Invoice invoice = new Invoice("INV-2026-0302", 402L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        Payment activePayment = new Payment(savedInvoice, "REC-2026-0303", new BigDecimal("80.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        activePayment.setStatus(PaymentStatus.RECORDED);

        Payment reversedPayment = new Payment(savedInvoice, "REC-2026-0304", new BigDecimal("40.00"), PaymentMethod.CARD, null, LocalDateTime.now(), 1L);
        reversedPayment.setStatus(PaymentStatus.REVERSED);
        reversedPayment.setReversalReason("Entered wrong card amount");

        entityManager.persist(activePayment);
        entityManager.persist(reversedPayment);
        entityManager.flush();

        List<Payment> recorded = paymentRepository.findByInvoiceIdAndStatusOrderByPaidAtAscIdAsc(savedInvoice.getId(), PaymentStatus.RECORDED);
        assertThat(recorded).hasSize(1);
        assertThat(recorded.get(0).getPaymentNumber()).isEqualTo("REC-2026-0303");

        List<Payment> reversed = paymentRepository.findByInvoiceIdAndStatusOrderByPaidAtAscIdAsc(savedInvoice.getId(), PaymentStatus.REVERSED);
        assertThat(reversed).hasSize(1);
        assertThat(reversed.get(0).getPaymentNumber()).isEqualTo("REC-2026-0304");
    }

    @Test
    @DisplayName("aggregate recorded payment total for an invoice, excluding REVERSED payments")
    void testSumRecordedPaymentsByInvoiceId() {
        Invoice invoice = new Invoice("INV-2026-0303", 403L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        Payment pay1 = new Payment(savedInvoice, "REC-2026-0305", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        pay1.setStatus(PaymentStatus.RECORDED);

        Payment pay2 = new Payment(savedInvoice, "REC-2026-0306", new BigDecimal("35.50"), PaymentMethod.BANK_TRANSFER, null, LocalDateTime.now(), 1L);
        pay2.setStatus(PaymentStatus.RECORDED);

        Payment reversedPay = new Payment(savedInvoice, "REC-2026-0307", new BigDecimal("100.00"), PaymentMethod.CARD, null, LocalDateTime.now(), 1L);
        reversedPay.setStatus(PaymentStatus.REVERSED);
        reversedPay.setReversalReason("Cancelled transaction");

        entityManager.persist(pay1);
        entityManager.persist(pay2);
        entityManager.persist(reversedPay);
        entityManager.flush();

        BigDecimal sum = paymentRepository.sumRecordedPaymentsByInvoiceId(savedInvoice.getId());
        assertThat(sum).isNotNull();
        assertThat(sum).isEqualByComparingTo(new BigDecimal("85.50"));
    }

    @Test
    @DisplayName("sumRecordedPaymentsByInvoiceId returns null when no recorded payments exist")
    void testSumRecordedPaymentsByInvoiceIdEmpty() {
        Invoice invoice = new Invoice("INV-2026-0304", 404L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        BigDecimal sum = paymentRepository.sumRecordedPaymentsByInvoiceId(savedInvoice.getId());
        assertThat(sum).isNull();
    }

    @Test
    @DisplayName("aggregate valid recorded payments over an explicit date/time range, excluding REVERSED payments")
    void testSumRecordedPaymentsBetween() {
        Invoice invoice = new Invoice("INV-2026-0305", 405L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        LocalDateTime rangeStart = LocalDateTime.of(2026, 9, 15, 8, 0, 0);
        LocalDateTime rangeEnd = LocalDateTime.of(2026, 9, 15, 17, 0, 0);

        // Before window
        Payment payBefore = new Payment(savedInvoice, "REC-TIME-01", new BigDecimal("100.00"), PaymentMethod.CASH, null, LocalDateTime.of(2026, 9, 15, 7, 59, 59), 1L);
        payBefore.setStatus(PaymentStatus.RECORDED);

        // Inside window - Recorded
        Payment payInside1 = new Payment(savedInvoice, "REC-TIME-02", new BigDecimal("200.00"), PaymentMethod.CASH, null, LocalDateTime.of(2026, 9, 15, 9, 30, 0), 1L);
        payInside1.setStatus(PaymentStatus.RECORDED);

        // Inside window - Recorded (Card)
        Payment payInside2 = new Payment(savedInvoice, "REC-TIME-03", new BigDecimal("150.00"), PaymentMethod.CARD, null, LocalDateTime.of(2026, 9, 15, 14, 15, 0), 1L);
        payInside2.setStatus(PaymentStatus.RECORDED);

        // Inside window - REVERSED (Must be excluded)
        Payment payInsideReversed = new Payment(savedInvoice, "REC-TIME-04", new BigDecimal("500.00"), PaymentMethod.CARD, null, LocalDateTime.of(2026, 9, 15, 11, 0, 0), 1L);
        payInsideReversed.setStatus(PaymentStatus.REVERSED);
        payInsideReversed.setReversalReason("Reversed slip");

        // After window
        Payment payAfter = new Payment(savedInvoice, "REC-TIME-05", new BigDecimal("300.00"), PaymentMethod.CASH, null, LocalDateTime.of(2026, 9, 15, 17, 0, 1), 1L);
        payAfter.setStatus(PaymentStatus.RECORDED);

        entityManager.persist(payBefore);
        entityManager.persist(payInside1);
        entityManager.persist(payInside2);
        entityManager.persist(payInsideReversed);
        entityManager.persist(payAfter);
        entityManager.flush();

        BigDecimal totalIncome = paymentRepository.sumRecordedPaymentsBetween(rangeStart, rangeEnd);
        assertThat(totalIncome).isNotNull();
        // 200.00 + 150.00 = 350.00
        assertThat(totalIncome).isEqualByComparingTo(new BigDecimal("350.00"));

        BigDecimal cashIncome = paymentRepository.sumRecordedPaymentsByMethodBetween(PaymentMethod.CASH, rangeStart, rangeEnd);
        assertThat(cashIncome).isEqualByComparingTo(new BigDecimal("200.00"));

        BigDecimal cardIncome = paymentRepository.sumRecordedPaymentsByMethodBetween(PaymentMethod.CARD, rangeStart, rangeEnd);
        assertThat(cardIncome).isEqualByComparingTo(new BigDecimal("150.00"));

        BigDecimal bankIncome = paymentRepository.sumRecordedPaymentsByMethodBetween(PaymentMethod.BANK_TRANSFER, rangeStart, rangeEnd);
        assertThat(bankIncome).isNull();
    }

    @Test
    @DisplayName("date-range boundary query inclusively matches timestamps and returns ordered results")
    void testDateRangeBoundarySemantics() {
        Invoice invoice = new Invoice("INV-2026-0306", 406L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        LocalDateTime exactStart = LocalDateTime.of(2026, 9, 1, 0, 0, 0);
        LocalDateTime exactEnd = LocalDateTime.of(2026, 9, 30, 23, 59, 59);

        Payment payAtStart = new Payment(savedInvoice, "REC-BOUND-01", new BigDecimal("60.00"), PaymentMethod.CASH, null, exactStart, 1L);
        Payment payAtEnd = new Payment(savedInvoice, "REC-BOUND-02", new BigDecimal("40.00"), PaymentMethod.CASH, null, exactEnd, 1L);

        entityManager.persist(payAtStart);
        entityManager.persist(payAtEnd);
        entityManager.flush();

        List<Payment> inRange = paymentRepository.findByStatusAndPaidAtBetweenOrderByPaidAtAscIdAsc(PaymentStatus.RECORDED, exactStart, exactEnd);
        assertThat(inRange).hasSize(2);
        assertThat(inRange.get(0).getPaymentNumber()).isEqualTo("REC-BOUND-01");
        assertThat(inRange.get(1).getPaymentNumber()).isEqualTo("REC-BOUND-02");

        BigDecimal sum = paymentRepository.sumRecordedPaymentsBetween(exactStart, exactEnd);
        assertThat(sum).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("check reversal linkage queries existsByReversalOfPaymentId and findByReversalOfPaymentId")
    void testReversalLinkageQueries() {
        Invoice invoice = new Invoice("INV-2026-0307", 407L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        Payment originalPayment = new Payment(savedInvoice, "REC-ORIG-01", new BigDecimal("100.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        Payment savedOriginal = entityManager.persistAndFlush(originalPayment);

        Payment reversingPayment = new Payment(savedInvoice, "REC-REV-01", new BigDecimal("100.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 2L);
        reversingPayment.setStatus(PaymentStatus.REVERSED);
        reversingPayment.setReversalOfPaymentId(savedOriginal.getId());
        reversingPayment.setReversalReason("Full refund authorized");
        entityManager.persistAndFlush(reversingPayment);

        assertThat(paymentRepository.existsByReversalOfPaymentId(savedOriginal.getId())).isTrue();
        assertThat(paymentRepository.existsByReversalOfPaymentId(99999L)).isFalse();

        Optional<Payment> foundReversal = paymentRepository.findByReversalOfPaymentId(savedOriginal.getId());
        assertThat(foundReversal).isPresent();
        assertThat(foundReversal.get().getPaymentNumber()).isEqualTo("REC-REV-01");
        assertThat(foundReversal.get().getReversalReason()).isEqualTo("Full refund authorized");
    }

    @Test
    @DisplayName("sumRecordedPaymentsInPeriod aggregates valid payments with start-inclusive, end-exclusive semantics")
    void testSumRecordedPaymentsInPeriodSemantics() {
        Invoice invoice = new Invoice("INV-2026-0308", 408L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        LocalDateTime periodStart = LocalDateTime.of(2026, 9, 15, 0, 0, 0);
        LocalDateTime periodEnd = LocalDateTime.of(2026, 9, 16, 0, 0, 0);

        // Exactly at periodStart (inclusive)
        Payment payAtStart = new Payment(savedInvoice, "REC-PER-01", new BigDecimal("100.00"), PaymentMethod.CASH, null, periodStart, 1L);
        payAtStart.setStatus(PaymentStatus.RECORDED);

        // Midday (inclusive)
        Payment payMidday = new Payment(savedInvoice, "REC-PER-02", new BigDecimal("150.50"), PaymentMethod.CARD, null, LocalDateTime.of(2026, 9, 15, 12, 30, 0), 1L);
        payMidday.setStatus(PaymentStatus.RECORDED);

        // REVERSED payment during period (must be excluded)
        Payment payReversed = new Payment(savedInvoice, "REC-PER-03", new BigDecimal("80.00"), PaymentMethod.CASH, null, LocalDateTime.of(2026, 9, 15, 14, 0, 0), 1L);
        payReversed.setStatus(PaymentStatus.REVERSED);
        payReversed.setReversalReason("Error");

        // Exactly at periodEnd (exclusive - must NOT be included)
        Payment payAtEnd = new Payment(savedInvoice, "REC-PER-04", new BigDecimal("200.00"), PaymentMethod.BANK_TRANSFER, null, periodEnd, 1L);
        payAtEnd.setStatus(PaymentStatus.RECORDED);

        entityManager.persist(payAtStart);
        entityManager.persist(payMidday);
        entityManager.persist(payReversed);
        entityManager.persist(payAtEnd);
        entityManager.flush();

        BigDecimal total = paymentRepository.sumRecordedPaymentsInPeriod(periodStart, periodEnd);
        assertThat(total).isNotNull();
        // 100.00 + 150.50 = 250.50
        assertThat(total).isEqualByComparingTo(new BigDecimal("250.50"));

        BigDecimal cashSum = paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, periodStart, periodEnd);
        assertThat(cashSum).isEqualByComparingTo(new BigDecimal("100.00"));

        BigDecimal cardSum = paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, periodStart, periodEnd);
        assertThat(cardSum).isEqualByComparingTo(new BigDecimal("150.50"));

        BigDecimal transferSum = paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, periodStart, periodEnd);
        assertThat(transferSum).isNull();

        BigDecimal otherSum = paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, periodStart, periodEnd);
        assertThat(otherSum).isNull();
    }

    @Test
    @DisplayName("sumRecordedPaymentsInPeriod returns null when no payments exist in period")
    void testSumRecordedPaymentsInPeriodEmpty() {
        LocalDateTime periodStart = LocalDateTime.of(2026, 1, 1, 0, 0, 0);
        LocalDateTime periodEnd = LocalDateTime.of(2026, 1, 2, 0, 0, 0);

        BigDecimal total = paymentRepository.sumRecordedPaymentsInPeriod(periodStart, periodEnd);
        assertThat(total).isNull();

        BigDecimal methodSum = paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, periodStart, periodEnd);
        assertThat(methodSum).isNull();
    }
}
