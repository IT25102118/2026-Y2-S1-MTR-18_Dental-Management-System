package com.dentcare.notification.repository;

import com.dentcare.appointment.entity.Appointment;
import com.dentcare.appointment.entity.AppointmentStatus;
import com.dentcare.notification.entity.AppointmentEmailNotification;
import com.dentcare.notification.entity.EmailNotificationStatus;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-appointment.sql,classpath:schema-notification.sql"
})
class AppointmentEmailNotificationRepositoryTest {

    @Autowired
    private AppointmentEmailNotificationRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    private User testPatientUser;
    private Appointment testAppointment;

    @BeforeEach
    void setUp() {
        testPatientUser = new User(
                "patient.test@dentcare.test",
                "$2a$10$abcdefghijklmnopqrstuvw1234567890abcdefghijklmnopqr",
                "Kasun",
                "Perera",
                "+94771234567",
                Role.PATIENT
        );
        entityManager.persist(testPatientUser);

        testAppointment = new Appointment();
        testAppointment.setPatient(testPatientUser);
        testAppointment.setAppointmentDate(LocalDate.now().plusDays(3));
        testAppointment.setPreferredTime("10:00");
        testAppointment.setReason("Routine Dental Checkup");
        testAppointment.setStatus(AppointmentStatus.PENDING);
        entityManager.persist(testAppointment);

        entityManager.flush();
    }

    @Test
    @DisplayName("1. Entity persists and reloads all core email outbox fields correctly")
    void testEntityPersistsAndReloads() {
        String key = "APPOINTMENT_REQUEST_RECEIVED:" + testAppointment.getId();
        AppointmentEmailNotification notification = new AppointmentEmailNotification(
                testAppointment,
                key,
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Dear Patient,\n\nYour appointment request has been successfully received by DentCare.\n\nBooking ID: " + testAppointment.getId()
        );

        AppointmentEmailNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<AppointmentEmailNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        AppointmentEmailNotification loaded = reloaded.get();
        assertThat(loaded.getIdempotencyKey()).isEqualTo(key);
        assertThat(loaded.getRecipientEmail()).isEqualTo("patient.test@dentcare.test");
        assertThat(loaded.getEmailSubject()).isEqualTo("DentCare - Appointment Request Received");
        assertThat(loaded.getEmailBody()).contains("Booking ID: " + testAppointment.getId());
        assertThat(loaded.getStatus()).isEqualTo(EmailNotificationStatus.PENDING);
        assertThat(loaded.getAttemptCount()).isEqualTo(0);
        assertThat(loaded.getNextRetryAt()).isNull();
        assertThat(loaded.getSentAt()).isNull();
        assertThat(loaded.getLastError()).isNull();
        assertThat(loaded.getCreatedAt()).isNotNull();
        assertThat(loaded.getUpdatedAt()).isNotNull();
        assertThat(loaded.getAppointment().getId()).isEqualTo(testAppointment.getId());
    }

    @Test
    @DisplayName("2. findByIdempotencyKey and existsByIdempotencyKey work as expected")
    void testFindAndExistsByIdempotencyKey() {
        String key = "APPOINTMENT_REQUEST_RECEIVED:" + testAppointment.getId();
        assertThat(repository.existsByIdempotencyKey(key)).isFalse();
        assertThat(repository.findByIdempotencyKey(key)).isEmpty();

        AppointmentEmailNotification notification = new AppointmentEmailNotification(
                testAppointment,
                key,
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Dear Patient,\n\nYour appointment request has been successfully received by DentCare."
        );
        repository.save(notification);
        entityManager.flush();

        assertThat(repository.existsByIdempotencyKey(key)).isTrue();
        assertThat(repository.findByIdempotencyKey(key)).isPresent();
        assertThat(repository.findByIdempotencyKey(key).get().getIdempotencyKey()).isEqualTo(key);
    }

    @Test
    @DisplayName("3. findByAppointmentId returns notifications linked to the appointment")
    void testFindByAppointmentId() {
        String key = "APPOINTMENT_REQUEST_RECEIVED:" + testAppointment.getId();
        AppointmentEmailNotification notification = new AppointmentEmailNotification(
                testAppointment,
                key,
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Dear Patient,\n\nBooking receipt"
        );
        repository.save(notification);
        entityManager.flush();

        List<AppointmentEmailNotification> list = repository.findByAppointmentId(testAppointment.getId());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getIdempotencyKey()).isEqualTo(key);
    }

    @Test
    @DisplayName("4. Enforces uniqueness on idempotency_key at database level")
    void testDuplicateIdempotencyKeyThrowsException() {
        String key = "APPOINTMENT_REQUEST_RECEIVED:" + testAppointment.getId();
        AppointmentEmailNotification notif1 = new AppointmentEmailNotification(
                testAppointment,
                key,
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "First body"
        );
        repository.save(notif1);
        entityManager.flush();

        AppointmentEmailNotification notif2 = new AppointmentEmailNotification(
                testAppointment,
                key,
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Duplicate body"
        );

        assertThatThrownBy(() -> repository.saveAndFlush(notif2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("5. Status-based polling queries return expected records")
    void testStatusBasedPollingQueries() {
        AppointmentEmailNotification notif1 = new AppointmentEmailNotification(
                testAppointment,
                "key-status-1",
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Body 1"
        );
        notif1.setStatus(EmailNotificationStatus.PENDING);
        notif1.setNextRetryAt(LocalDateTime.now().minusMinutes(1));
        repository.save(notif1);

        AppointmentEmailNotification notif2 = new AppointmentEmailNotification(
                testAppointment,
                "key-status-2",
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Body 2"
        );
        notif2.setStatus(EmailNotificationStatus.SENT);
        notif2.setSentAt(LocalDateTime.now());
        repository.save(notif2);

        entityManager.flush();

        List<AppointmentEmailNotification> pendingList = repository.findByStatus(EmailNotificationStatus.PENDING);
        assertThat(pendingList).hasSize(1);
        assertThat(pendingList.get(0).getIdempotencyKey()).isEqualTo("key-status-1");

        List<AppointmentEmailNotification> retryReady = repository.findByStatusAndNextRetryAtLessThanEqual(
                EmailNotificationStatus.PENDING,
                LocalDateTime.now()
        );
        assertThat(retryReady).hasSize(1);

        List<AppointmentEmailNotification> ordered = repository.findByStatusOrderByCreatedAtAsc(EmailNotificationStatus.PENDING);
        assertThat(ordered).hasSize(1);
    }

    @Test
    @DisplayName("6. Processing lease fields default correctly and persist accurately")
    void testProcessingLeaseFieldsDefaultAndPersist() {
        String key = "test-lease-defaults-" + System.currentTimeMillis();
        AppointmentEmailNotification notification = new AppointmentEmailNotification(
                testAppointment,
                key,
                "patient.test@dentcare.test",
                "DentCare - Appointment Request Received",
                "Booking receipt"
        );

        // Verify initial programmatic state before persist
        assertThat(notification.getMaxAttempts()).isEqualTo(3);
        assertThat(notification.getLockedAt()).isNull();
        assertThat(notification.getLockedBy()).isNull();
        assertThat(notification.getLeaseUntil()).isNull();

        AppointmentEmailNotification saved = repository.saveAndFlush(notification);
        entityManager.clear();

        AppointmentEmailNotification loaded = repository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getMaxAttempts()).isEqualTo(3);
        assertThat(loaded.getLockedAt()).isNull();
        assertThat(loaded.getLockedBy()).isNull();
        assertThat(loaded.getLeaseUntil()).isNull();

        // Update with lease claim
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime leaseExpiry = now.plusMinutes(5);
        loaded.setStatus(EmailNotificationStatus.PROCESSING);
        loaded.setLockedAt(now);
        loaded.setLockedBy("worker-pod-alpha-1");
        loaded.setLeaseUntil(leaseExpiry);
        loaded.setMaxAttempts(5);

        repository.saveAndFlush(loaded);
        entityManager.clear();

        AppointmentEmailNotification reloadedWithLease = repository.findById(saved.getId()).orElseThrow();
        assertThat(reloadedWithLease.getStatus()).isEqualTo(EmailNotificationStatus.PROCESSING);
        assertThat(reloadedWithLease.getLockedAt()).isNotNull();
        assertThat(reloadedWithLease.getLockedBy()).isEqualTo("worker-pod-alpha-1");
        assertThat(reloadedWithLease.getLeaseUntil()).isNotNull();
        assertThat(reloadedWithLease.getMaxAttempts()).isEqualTo(5);
    }

    @Test
    @DisplayName("7. maxAttempts cannot be zero or negative")
    void testMaxAttemptsCannotBeZeroOrNegative() {
        AppointmentEmailNotification zeroAttempts = new AppointmentEmailNotification(
                testAppointment,
                "key-zero-attempts-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        zeroAttempts.setMaxAttempts(0);

        assertThatThrownBy(() -> repository.saveAndFlush(zeroAttempts))
                .isInstanceOf(Exception.class);

        AppointmentEmailNotification negativeAttempts = new AppointmentEmailNotification(
                testAppointment,
                "key-neg-attempts-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        negativeAttempts.setMaxAttempts(-1);

        assertThatThrownBy(() -> repository.saveAndFlush(negativeAttempts))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("8. Worker identifier lockedBy length is constrained to 128 characters")
    void testLockedByLengthConstraint() {
        AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment,
                "key-long-worker-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        String overlyLongWorkerId = "w".repeat(129);
        notif.setLockedBy(overlyLongWorkerId);

        assertThatThrownBy(() -> repository.saveAndFlush(notif))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("9. All notification statuses remain compatible alongside lease fields")
    void testAllStatusesCompatibleWithLease() {
        for (EmailNotificationStatus status : EmailNotificationStatus.values()) {
            AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment,
                "key-status-compat-" + status.name() + "-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject for " + status.name(),
                "Body for " + status.name()
            );
            notif.setStatus(status);
            notif.setLockedAt(LocalDateTime.now());
            notif.setLockedBy("worker-test");
            notif.setLeaseUntil(LocalDateTime.now().plusMinutes(2));
            notif.setMaxAttempts(3);

            AppointmentEmailNotification saved = repository.saveAndFlush(notif);
            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getStatus()).isEqualTo(status);
        }
    }

    @Test
    @DisplayName("10. Recovery query by status and leaseUntil identifies expired processing claims")
    void testRecoveryQueryIdentifiesStaleLeases() {
        // Active processing claim
        AppointmentEmailNotification activeClaim = new AppointmentEmailNotification(
                testAppointment,
                "key-active-claim-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject Active",
                "Body Active"
        );
        activeClaim.setStatus(EmailNotificationStatus.PROCESSING);
        activeClaim.setLockedAt(LocalDateTime.now().minusMinutes(1));
        activeClaim.setLockedBy("worker-active");
        activeClaim.setLeaseUntil(LocalDateTime.now().plusMinutes(4)); // unexpired
        repository.save(activeClaim);

        // Expired processing claim (candidate for crash recovery reconciliation)
        AppointmentEmailNotification expiredClaim = new AppointmentEmailNotification(
                testAppointment,
                "key-expired-claim-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject Expired",
                "Body Expired"
        );
        expiredClaim.setStatus(EmailNotificationStatus.PROCESSING);
        expiredClaim.setLockedAt(LocalDateTime.now().minusMinutes(10));
        expiredClaim.setLockedBy("worker-crashed");
        expiredClaim.setLeaseUntil(LocalDateTime.now().minusMinutes(5)); // expired!
        repository.save(expiredClaim);

        entityManager.flush();
        entityManager.clear();

        List<AppointmentEmailNotification> staleClaims = entityManager.getEntityManager()
                .createQuery(
                        "SELECT n FROM AppointmentEmailNotification n WHERE n.status = :status AND n.leaseUntil <= :now",
                        AppointmentEmailNotification.class
                )
                .setParameter("status", EmailNotificationStatus.PROCESSING)
                .setParameter("now", LocalDateTime.now())
                .getResultList();

        assertThat(staleClaims).hasSize(1);
        assertThat(staleClaims.get(0).getIdempotencyKey()).isEqualTo(expiredClaim.getIdempotencyKey());
        assertThat(staleClaims.get(0).getLockedBy()).isEqualTo("worker-crashed");
    }

    @Test
    @DisplayName("11. findEligibleNotificationIdsForClaim locks and returns only eligible pending records")
    void testFindEligibleNotificationIdsForClaim() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime activationCutoff = now.minusHours(1);

        // 1. Eligible pending notification
        AppointmentEmailNotification eligible = new AppointmentEmailNotification(
                testAppointment,
                "key-eligible-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        eligible.setStatus(EmailNotificationStatus.PENDING);
        eligible.setAttemptCount(0);
        eligible.setMaxAttempts(3);
        eligible = repository.save(eligible);

        // 2. Ineligible: Status is PROCESSING
        AppointmentEmailNotification processing = new AppointmentEmailNotification(
                testAppointment,
                "key-processing-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        processing.setStatus(EmailNotificationStatus.PROCESSING);
        repository.save(processing);

        // 3. Ineligible: attemptCount >= maxAttempts
        AppointmentEmailNotification exhausted = new AppointmentEmailNotification(
                testAppointment,
                "key-exhausted-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        exhausted.setStatus(EmailNotificationStatus.PENDING);
        exhausted.setAttemptCount(3);
        exhausted.setMaxAttempts(3);
        repository.save(exhausted);

        // 4. Ineligible: nextRetryAt in future
        AppointmentEmailNotification futureRetry = new AppointmentEmailNotification(
                testAppointment,
                "key-future-retry-" + System.currentTimeMillis(),
                "patient.test@dentcare.test",
                "Subject",
                "Body"
        );
        futureRetry.setStatus(EmailNotificationStatus.PENDING);
        futureRetry.setNextRetryAt(now.plusMinutes(10));
        repository.save(futureRetry);

        entityManager.flush();

        List<Long> lockedIds = repository.findEligibleNotificationIdsForClaim(now, activationCutoff, 10);
        assertThat(lockedIds).contains(eligible.getId());
        assertThat(lockedIds).doesNotContain(processing.getId(), exhausted.getId(), futureRetry.getId());
    }
}


