package com.dentcare.notification.repository;

import com.dentcare.notification.entity.AppointmentEmailNotification;
import com.dentcare.notification.entity.EmailNotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for AppointmentEmailNotification outbox entities.
 */
@Repository
public interface AppointmentEmailNotificationRepository extends JpaRepository<AppointmentEmailNotification, Long> {

    /**
     * Finds a notification by its unique idempotency key.
     *
     * @param idempotencyKey unique key identifying the notification intent
     * @return optional containing the matching notification if present
     */
    Optional<AppointmentEmailNotification> findByIdempotencyKey(String idempotencyKey);

    /**
     * Checks if a notification exists for a given idempotency key.
     *
     * @param idempotencyKey unique key to check
     * @return true if an outbox record with this key exists
     */
    boolean existsByIdempotencyKey(String idempotencyKey);

    /**
     * Finds all outbox notifications associated with a given appointment ID.
     *
     * @param appointmentId the ID of the appointment
     * @return list of outbox notifications for the appointment
     */
    List<AppointmentEmailNotification> findByAppointmentId(Long appointmentId);

    /**
     * Finds notifications by status, supporting future status-based polling.
     *
     * @param status lifecycle status to filter by
     * @return list of matching notifications
     */
    List<AppointmentEmailNotification> findByStatus(EmailNotificationStatus status);

    /**
     * Finds notifications by status ordered by creation timestamp ascending.
     *
     * @param status lifecycle status to filter by
     * @return list of matching notifications ordered oldest first
     */
    List<AppointmentEmailNotification> findByStatusOrderByCreatedAtAsc(EmailNotificationStatus status);

    /**
     * Finds pending or retryable notifications due for processing.
     *
     * @param status lifecycle status
     * @param threshold current timestamp threshold
     * @return list of notifications ready for retry or dispatch
     */
    List<AppointmentEmailNotification> findByStatusAndNextRetryAtLessThanEqual(
            EmailNotificationStatus status,
            LocalDateTime threshold
    );

    /**
     * Acquires exclusive row locks on eligible pending notifications using MySQL FOR UPDATE SKIP LOCKED.
     *
     * @param now current timestamp for next_retry_at evaluation
     * @param activationCutoff minimum created_at timestamp to exclude pre-activation backlog
     * @param batchSize maximum number of IDs to lock and return
     * @return list of locked notification IDs
     */
    @Query(value = """
            SELECT id
            FROM appointment_email_outbox
            WHERE status = 'PENDING'
              AND attempt_count < max_attempts
              AND (next_retry_at IS NULL OR next_retry_at <= :now)
              AND created_at >= :activationCutoff
            ORDER BY created_at ASC, id ASC
            LIMIT :batchSize
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<Long> findEligibleNotificationIdsForClaim(
            @Param("now") LocalDateTime now,
            @Param("activationCutoff") LocalDateTime activationCutoff,
            @Param("batchSize") int batchSize
    );
}

