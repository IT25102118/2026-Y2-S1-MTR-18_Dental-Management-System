package com.dentcare.notification.repository;

import com.dentcare.notification.entity.SmsOutboxNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for SmsOutboxNotification entities.
 */
@Repository
public interface SmsOutboxNotificationRepository extends JpaRepository<SmsOutboxNotification, Long> {

    /**
     * Finds a notification by its unique idempotency key.
     *
     * @param idempotencyKey unique key identifying the notification intent
     * @return optional containing the matching notification if present
     */
    Optional<SmsOutboxNotification> findByIdempotencyKey(String idempotencyKey);

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
    List<SmsOutboxNotification> findByAppointmentId(Long appointmentId);
}
