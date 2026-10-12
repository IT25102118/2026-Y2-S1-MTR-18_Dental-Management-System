package com.dentcare.notification.service;

import com.dentcare.notification.entity.AppointmentEmailNotification;
import com.dentcare.notification.entity.EmailNotificationStatus;
import com.dentcare.notification.repository.AppointmentEmailNotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service providing atomic, transaction-safe claiming of pending appointment email
 * notifications from the transactional outbox table.
 *
 * Employs MySQL 8.4 FOR UPDATE SKIP LOCKED to prevent duplicate multi-worker claims,
 * assigns lease ownership with a unique claim token, and reserves delivery retry budget.
 *
 * Executes in a short, independent transaction using READ_COMMITTED isolation and
 * REQUIRES_NEW propagation to minimize locking scope and avoid gap-lock deadlocks.
 */
@Service
@Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
public class AppointmentEmailClaimService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentEmailClaimService.class);

    public static final long DEFAULT_LEASE_DURATION_SECONDS = 120L;
    public static final long MIN_LEASE_DURATION_SECONDS = 5L;
    public static final long MAX_LEASE_DURATION_SECONDS = 3600L;
    public static final int DEFAULT_BATCH_SIZE = 10;
    public static final int MIN_BATCH_SIZE = 1;
    public static final int MAX_BATCH_SIZE = 50;

    private final AppointmentEmailNotificationRepository notificationRepository;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public AppointmentEmailClaimService(
            AppointmentEmailNotificationRepository notificationRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) Clock clock
    ) {
        this.notificationRepository = Objects.requireNonNull(notificationRepository, "notificationRepository must not be null");
        this.clock = clock != null ? clock : Clock.systemDefaultZone();
    }

    public AppointmentEmailClaimService(AppointmentEmailNotificationRepository notificationRepository) {
        this(notificationRepository, (Clock) null);
    }

    /**
     * Atomically claims eligible pending notifications using default batch size and lease duration.
     *
     * @param activationCutoff explicit cutoff; notifications created before this are excluded
     * @return claim result with unique claim token and claimed notification IDs
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public AppointmentEmailClaimResult claimPendingEmails(LocalDateTime activationCutoff) {
        return claimPendingEmails(activationCutoff, DEFAULT_BATCH_SIZE, DEFAULT_LEASE_DURATION_SECONDS);
    }

    /**
     * Atomically claims eligible pending notifications with specified batch size and default lease duration.
     *
     * @param activationCutoff explicit cutoff; notifications created before this are excluded
     * @param batchSize maximum number of notifications to claim
     * @return claim result with unique claim token and claimed notification IDs
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public AppointmentEmailClaimResult claimPendingEmails(LocalDateTime activationCutoff, int batchSize) {
        return claimPendingEmails(activationCutoff, batchSize, DEFAULT_LEASE_DURATION_SECONDS);
    }

    /**
     * Atomically claims eligible pending notifications with specified batch size and lease duration.
     *
     * @param activationCutoff explicit cutoff; notifications created before this are excluded
     * @param batchSize maximum number of notifications to claim (1 - 50)
     * @param leaseDurationSeconds lease duration in seconds (5 - 3600)
     * @return claim result with unique claim token and claimed notification IDs
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public AppointmentEmailClaimResult claimPendingEmails(
            LocalDateTime activationCutoff,
            int batchSize,
            long leaseDurationSeconds
    ) {
        if (activationCutoff == null) {
            throw new IllegalArgumentException("Activation cutoff must not be null");
        }
        if (batchSize < MIN_BATCH_SIZE || batchSize > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException(
                    "Batch size must be between " + MIN_BATCH_SIZE + " and " + MAX_BATCH_SIZE + ", given: " + batchSize
            );
        }
        if (leaseDurationSeconds < MIN_LEASE_DURATION_SECONDS || leaseDurationSeconds > MAX_LEASE_DURATION_SECONDS) {
            throw new IllegalArgumentException(
                    "Lease duration must be between " + MIN_LEASE_DURATION_SECONDS + " and " + MAX_LEASE_DURATION_SECONDS + " seconds, given: " + leaseDurationSeconds
            );
        }

        String claimToken = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime leaseUntil = now.plusSeconds(leaseDurationSeconds);

        List<Long> eligibleIds = notificationRepository.findEligibleNotificationIdsForClaim(
                now,
                activationCutoff,
                batchSize
        );

        if (eligibleIds == null || eligibleIds.isEmpty()) {
            return AppointmentEmailClaimResult.empty(claimToken, leaseUntil);
        }

        List<AppointmentEmailNotification> entities = notificationRepository.findAllById(eligibleIds);
        Map<Long, AppointmentEmailNotification> entityMap = entities.stream()
                .collect(Collectors.toMap(AppointmentEmailNotification::getId, Function.identity()));

        List<Long> claimedIds = new ArrayList<>();
        List<AppointmentEmailNotification> claimedEntities = new ArrayList<>();

        for (Long id : eligibleIds) {
            AppointmentEmailNotification entity = entityMap.get(id);
            if (entity == null) {
                continue;
            }

            // Defense-in-depth eligibility checks
            if (entity.getStatus() != EmailNotificationStatus.PENDING) {
                log.warn("Skipping notification {} because status is {} (expected PENDING)", id, entity.getStatus());
                continue;
            }
            if (entity.getAttemptCount() >= entity.getMaxAttempts()) {
                log.warn("Skipping notification {} because attempt_count {} >= max_attempts {}", id, entity.getAttemptCount(), entity.getMaxAttempts());
                continue;
            }
            if (entity.getNextRetryAt() != null && entity.getNextRetryAt().isAfter(now)) {
                log.warn("Skipping notification {} because next_retry_at {} is in the future", id, entity.getNextRetryAt());
                continue;
            }
            if (entity.getCreatedAt() != null && entity.getCreatedAt().isBefore(activationCutoff)) {
                log.warn("Skipping notification {} because created_at {} is before activation cutoff {}", id, entity.getCreatedAt(), activationCutoff);
                continue;
            }

            entity.setStatus(EmailNotificationStatus.PROCESSING);
            entity.setLockedAt(now);
            entity.setLockedBy(claimToken);
            entity.setLeaseUntil(leaseUntil);
            entity.setAttemptCount(entity.getAttemptCount() + 1);

            claimedIds.add(id);
            claimedEntities.add(entity);
        }

        if (!claimedEntities.isEmpty()) {
            notificationRepository.saveAll(claimedEntities);
        }

        return new AppointmentEmailClaimResult(
                claimToken,
                claimedIds,
                leaseUntil,
                claimedIds.size()
        );
    }
}
