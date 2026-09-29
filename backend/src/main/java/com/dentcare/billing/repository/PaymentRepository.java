package com.dentcare.billing.repository;

import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Payment} entity (MF-05).
 * Enforces financial integrity:
 * - payments are immutable historical records (no physical deletion)
 * - REVERSED payments are strictly excluded from recorded-payment balances and income aggregation
 * - explicit time boundaries are accepted for daily/monthly income aggregation
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /**
     * Retrieves a payment with a pessimistic write lock for controlled reversal.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    /**
     * Finds a payment by its unique business receipt/payment number.
     */
    Optional<Payment> findByPaymentNumber(String paymentNumber);

    /**
     * Checks if a payment exists with the given payment number.
     */
    boolean existsByPaymentNumber(String paymentNumber);

    /**
     * Retrieves all payments for an invoice in chronological order.
     */
    List<Payment> findByInvoiceIdOrderByPaidAtAscIdAsc(Long invoiceId);

    /**
     * Retrieves payments for an invoice filtered by operational status (e.g. RECORDED or REVERSED).
     */
    List<Payment> findByInvoiceIdAndStatusOrderByPaidAtAscIdAsc(Long invoiceId, PaymentStatus status);

    /**
     * Checks if a compensating reversal payment already exists for a specified original payment.
     */
    boolean existsByReversalOfPaymentId(Long reversalOfPaymentId);

    /**
     * Retrieves the compensating reversal payment referencing a specified original payment.
     */
    Optional<Payment> findByReversalOfPaymentId(Long reversalOfPaymentId);

    /**
     * Calculates the sum of valid RECORDED payments for an invoice.
     * REVERSED payments are strictly excluded.
     * Returns null if no active recorded payments exist for the invoice.
     */
    @Query("SELECT SUM(p.amount) FROM Payment p " +
           "WHERE p.invoice.id = :invoiceId " +
           "AND p.status = com.dentcare.billing.entity.PaymentStatus.RECORDED")
    BigDecimal sumRecordedPaymentsByInvoiceId(@Param("invoiceId") Long invoiceId);

    /**
     * Calculates total clinic income over an explicit date/time range.
     * Sums only valid RECORDED payments; REVERSED payments are strictly excluded.
     * Returns null if no recorded payments exist in the specified window.
     */
    @Query("SELECT SUM(p.amount) FROM Payment p " +
           "WHERE p.status = com.dentcare.billing.entity.PaymentStatus.RECORDED " +
           "AND p.paidAt >= :startDateTime AND p.paidAt <= :endDateTime")
    BigDecimal sumRecordedPaymentsBetween(
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );

    /**
     * Calculates clinic income for a specific payment method over an explicit date/time range.
     * Sums only valid RECORDED payments; REVERSED payments are strictly excluded.
     * Returns null if no recorded payments exist for that method in the window.
     */
    @Query("SELECT SUM(p.amount) FROM Payment p " +
           "WHERE p.status = com.dentcare.billing.entity.PaymentStatus.RECORDED " +
           "AND p.paymentMethod = :method " +
           "AND p.paidAt >= :startDateTime AND p.paidAt <= :endDateTime")
    BigDecimal sumRecordedPaymentsByMethodBetween(
            @Param("method") PaymentMethod method,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );

    /**
     * Retrieves all payments matching a status within an explicit date/time range in chronological order.
     */
    List<Payment> findByStatusAndPaidAtBetweenOrderByPaidAtAscIdAsc(
            PaymentStatus status,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime
    );

    /**
     * Calculates total clinic income over an explicit half-open date/time range [startDateTime, endDateTime).
     * Sums only valid RECORDED payments; REVERSED payments are strictly excluded.
     * Returns null if no recorded payments exist in the specified window.
     */
    @Query("SELECT SUM(p.amount) FROM Payment p " +
           "WHERE p.status = com.dentcare.billing.entity.PaymentStatus.RECORDED " +
           "AND p.paidAt >= :startDateTime AND p.paidAt < :endDateTime")
    BigDecimal sumRecordedPaymentsInPeriod(
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );

    /**
     * Calculates clinic income for a specific payment method over an explicit half-open date/time range [startDateTime, endDateTime).
     * Sums only valid RECORDED payments; REVERSED payments are strictly excluded.
     * Returns null if no recorded payments exist for that method in the window.
     */
    @Query("SELECT SUM(p.amount) FROM Payment p " +
           "WHERE p.status = com.dentcare.billing.entity.PaymentStatus.RECORDED " +
           "AND p.paymentMethod = :method " +
           "AND p.paidAt >= :startDateTime AND p.paidAt < :endDateTime")
    BigDecimal sumRecordedPaymentsByMethodInPeriod(
            @Param("method") PaymentMethod method,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );
}
