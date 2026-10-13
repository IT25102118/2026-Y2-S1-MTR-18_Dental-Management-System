package com.dentcare.notification.service;

import com.dentcare.notification.entity.AppointmentEmailNotification;
import com.dentcare.notification.entity.EmailNotificationStatus;
import com.dentcare.notification.repository.AppointmentEmailNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Service providing atomic, claim-ownership-validated finalization of appointment email notifications
 * following a delivery attempt.
 *
 * Enforces strict claim token ownership, row-level pessimistic locking, independent transaction boundaries
 * (READ_COMMITTED and REQUIRES_NEW), exponential retry backoff, and sanitized failure categorization without
 * leaking sensitive credentials, recipient details, or raw stack traces.
 *
 * <p>Expired Lease Semantics:
 * Lease expiration alone does not trigger automatic resends or status changes. If an originating worker
 * returns a definitive result after its lease duration has elapsed, the result is accepted if and only if
 * the record remains in PROCESSING status with the exact same claim ownership token. If an explicit
 * reconciliation process has already transitioned the record (e.g., to DELIVERY_UNCERTAIN or FAILED),
 * the late result is safely rejected to prevent state overwrites.
 */
@Service
@Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
public class AppointmentEmailDeliveryResultService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentEmailDeliveryResultService.class);

    public static final long BASE_BACKOFF_SECONDS = 60L;
    public static final long MAX_BACKOFF_SECONDS = 3600L;
    public static final int MAX_ERROR_LENGTH = 255;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern CREDENTIAL_PATTERN = Pattern.compile("(?i)(password|secret|token|bearer|cred|authorization)[=:\\s]+[^\\s,;]+");

    private final AppointmentEmailNotificationRepository notificationRepository;
    private final Clock clock;

    @Autowired
    public AppointmentEmailDeliveryResultService(
            AppointmentEmailNotificationRepository notificationRepository,
            @Autowired(required = false) Clock clock
    ) {
        this.notificationRepository = Objects.requireNonNull(notificationRepository, "notificationRepository must not be null");
        this.clock = clock != null ? clock : Clock.systemDefaultZone();
    }

    public AppointmentEmailDeliveryResultService(AppointmentEmailNotificationRepository notificationRepository) {
        this(notificationRepository, (Clock) null);
    }

    /**
     * Finalizes the delivery outcome of a previously claimed notification using default outcome category.
     *
     * @param notificationId ID of the claimed notification
     * @param claimToken     unique claim ownership token issued during the claim operation
     * @param outcome        classified delivery outcome
     * @return the finalized, updated entity
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public AppointmentEmailNotification recordDeliveryResult(
            Long notificationId,
            String claimToken,
            EmailDeliveryOutcome outcome
    ) {
        return recordDeliveryResult(notificationId, claimToken, outcome, null);
    }

    /**
     * Atomically finalizes the delivery outcome of a previously claimed notification with optional error detail.
     *
     * @param notificationId ID of the claimed notification
     * @param claimToken     unique claim ownership token issued during the claim operation
     * @param outcome        classified delivery outcome
     * @param errorDetail    optional error code, category, or detail to be sanitized and recorded
     * @return the finalized, updated entity
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public AppointmentEmailNotification recordDeliveryResult(
            Long notificationId,
            String claimToken,
            EmailDeliveryOutcome outcome,
            String errorDetail
    ) {
        if (notificationId == null) {
            throw new IllegalArgumentException("Notification ID must not be null");
        }
        if (claimToken == null || claimToken.isBlank()) {
            throw new IllegalArgumentException("Claim token must not be blank");
        }
        if (outcome == null) {
            throw new IllegalArgumentException("Delivery outcome must not be null");
        }

        // Lock target row with PESSIMISTIC_WRITE
        AppointmentEmailNotification entity = notificationRepository.findByIdForUpdate(notificationId)
                .orElseThrow(() -> new IllegalStateException("Notification not found with ID: " + notificationId));

        // Validate that notification is in PROCESSING status
        if (entity.getStatus() != EmailNotificationStatus.PROCESSING) {
            log.warn("Cannot record delivery result for notification {}: status is {} (expected PROCESSING)",
                    notificationId, entity.getStatus());
            throw new IllegalStateException("Notification " + notificationId + " is not in PROCESSING status (found: " + entity.getStatus() + ")");
        }

        // Validate exact claim token ownership
        if (!Objects.equals(entity.getLockedBy(), claimToken)) {
            log.warn("Claim ownership mismatch for notification {}: provided token does not match active worker token",
                    notificationId);
            throw new IllegalStateException("Claim ownership mismatch for notification " + notificationId);
        }

        LocalDateTime now = LocalDateTime.now(clock);
        String sanitizedError = sanitizeError(errorDetail, outcome);

        switch (outcome) {
            case ACCEPTED_BY_SMTP -> {
                entity.setStatus(EmailNotificationStatus.SENT);
                entity.setSentAt(now);
                entity.setLockedAt(null);
                entity.setLockedBy(null);
                entity.setLeaseUntil(null);
                entity.setNextRetryAt(null);
                entity.setLastError(null);
                log.info("Notification {} transitioned to SENT (accepted by SMTP relay)", notificationId);
            }
            case DEFINITELY_NOT_ACCEPTED_PERMANENT -> {
                entity.setStatus(EmailNotificationStatus.FAILED);
                entity.setLastError(sanitizedError);
                entity.setLockedAt(null);
                entity.setLockedBy(null);
                entity.setLeaseUntil(null);
                entity.setNextRetryAt(null);
                log.warn("Notification {} permanently failed: {}", notificationId, sanitizedError);
            }
            case DEFINITELY_NOT_ACCEPTED_TRANSIENT -> {
                if (entity.getAttemptCount() < entity.getMaxAttempts()) {
                    long delaySeconds = computeBackoffDelaySeconds(entity.getAttemptCount());
                    entity.setStatus(EmailNotificationStatus.PENDING);
                    entity.setNextRetryAt(now.plusSeconds(delaySeconds));
                    entity.setLastError(sanitizedError);
                    entity.setLockedAt(null);
                    entity.setLockedBy(null);
                    entity.setLeaseUntil(null);
                    log.info("Notification {} scheduled for retry in {} seconds (attempt {} of {})",
                            notificationId, delaySeconds, entity.getAttemptCount(), entity.getMaxAttempts());
                } else {
                    entity.setStatus(EmailNotificationStatus.FAILED);
                    entity.setNextRetryAt(null);
                    entity.setLastError(sanitizedError != null ? sanitizedError : "MAX_ATTEMPTS_EXCEEDED");
                    entity.setLockedAt(null);
                    entity.setLockedBy(null);
                    entity.setLeaseUntil(null);
                    log.warn("Notification {} exhausted retry budget ({} of {}): transitioned to FAILED",
                            notificationId, entity.getAttemptCount(), entity.getMaxAttempts());
                }
            }
            case DELIVERY_OUTCOME_UNKNOWN -> {
                entity.setStatus(EmailNotificationStatus.DELIVERY_UNCERTAIN);
                entity.setLastError(sanitizedError != null ? sanitizedError : "SMTP_OUTCOME_UNKNOWN");
                entity.setLockedAt(null);
                entity.setLockedBy(null);
                entity.setLeaseUntil(null);
                entity.setNextRetryAt(null);
                log.warn("Notification {} delivery outcome unknown: transitioned to DELIVERY_UNCERTAIN", notificationId);
            }
        }

        return notificationRepository.save(entity);
    }

    /**
     * Calculates exponential backoff delay in seconds based on the attempt count.
     *
     * Attempt 1: 60s
     * Attempt 2: 120s
     * Attempt 3: 240s
     * Subsequent: exponential delay capped at 3600s.
     *
     * @param attemptCount number of attempts performed so far
     * @return delay in seconds
     */
    public static long computeBackoffDelaySeconds(int attemptCount) {
        if (attemptCount <= 1) {
            return BASE_BACKOFF_SECONDS;
        }
        int shift = Math.min(attemptCount - 1, 6);
        long delay = BASE_BACKOFF_SECONDS * (1L << shift);
        return Math.min(delay, MAX_BACKOFF_SECONDS);
    }

    /**
     * Sanitizes error details to ensure no credentials, passwords, recipient emails, or raw stack traces
     * are persisted to the database.
     */
    public static String sanitizeError(String rawError, EmailDeliveryOutcome outcome) {
        if (rawError == null || rawError.isBlank()) {
            return switch (outcome) {
                case DEFINITELY_NOT_ACCEPTED_PERMANENT -> "PERMANENT_REJECTION";
                case DEFINITELY_NOT_ACCEPTED_TRANSIENT -> "TRANSIENT_FAILURE";
                case DELIVERY_OUTCOME_UNKNOWN -> "SMTP_OUTCOME_UNKNOWN";
                case ACCEPTED_BY_SMTP -> null;
            };
        }

        String cleaned = rawError.trim();

        // Strip stack traces (take only the first line or strip \tat / Exception traces)
        int newlineIdx = cleaned.indexOf('\n');
        if (newlineIdx >= 0) {
            cleaned = cleaned.substring(0, newlineIdx).trim();
        }
        int crIdx = cleaned.indexOf('\r');
        if (crIdx >= 0) {
            cleaned = cleaned.substring(0, crIdx).trim();
        }

        // Redact email addresses to prevent exposing recipient details
        cleaned = EMAIL_PATTERN.matcher(cleaned).replaceAll("[REDACTED_EMAIL]");

        // Redact credentials and passwords
        cleaned = CREDENTIAL_PATTERN.matcher(cleaned).replaceAll("$1=[REDACTED]");

        // Strip any remaining control characters
        cleaned = cleaned.replaceAll("[\\p{Cntrl}]", " ").trim();

        if (cleaned.length() > MAX_ERROR_LENGTH) {
            cleaned = cleaned.substring(0, MAX_ERROR_LENGTH);
        }

        return cleaned.isBlank() ? "ERROR_RECORDED" : cleaned;
    }
}
