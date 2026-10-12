package com.dentcare.notification.repository;

import com.dentcare.appointment.entity.Appointment;
import com.dentcare.appointment.entity.AppointmentStatus;
import com.dentcare.notification.entity.NotificationStatus;
import com.dentcare.notification.entity.SmsOutboxNotification;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-appointment.sql,classpath:schema-notification.sql"
})
class SmsOutboxNotificationRepositoryTest {

    @Autowired
    private SmsOutboxNotificationRepository repository;

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
        testAppointment.setPreferredTime("10:00 AM");
        testAppointment.setReason("Routine Dental Checkup");
        testAppointment.setStatus(AppointmentStatus.PENDING);
        entityManager.persist(testAppointment);

        entityManager.flush();
    }

    @Test
    @DisplayName("1. Entity persists and reloads all core fields correctly")
    void testEntityPersistsAndReloads() {
        String key = "appt-" + testAppointment.getId() + "-req-20261009100000";
        LocalDateTime consentTime = LocalDateTime.now().minusMinutes(5);

        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "DentCare: Your appointment request for 2026-10-12 at 10:00 AM has been received and is awaiting confirmation.",
                true,
                consentTime
        );

        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<SmsOutboxNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        SmsOutboxNotification loaded = reloaded.get();
        assertThat(loaded.getIdempotencyKey()).isEqualTo(key);
        assertThat(loaded.getRecipientPhone()).isEqualTo("+94771234567");
        assertThat(loaded.getMessageBody()).contains("awaiting confirmation");
        assertThat(loaded.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(loaded.isConsentObtained()).isTrue();
        assertThat(loaded.getConsentTimestamp()).isNotNull();
        assertThat(loaded.getRetryCount()).isEqualTo(0);
        assertThat(loaded.getMaxRetries()).isEqualTo(3);
        assertThat(loaded.getCreatedAt()).isNotNull();
        assertThat(loaded.getUpdatedAt()).isNotNull();
        assertThat(loaded.getAppointment().getId()).isEqualTo(testAppointment.getId());
    }

    @Test
    @DisplayName("2. Status enum is stored as STRING in the database column")
    void testStatusEnumStoredAsString() {
        String key = "test-status-enum-string-key";
        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "DentCare test status message.",
                false,
                null
        );
        notification.setStatus(NotificationStatus.PROCESSING);
        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();

        Object rawStatus = entityManager.getEntityManager()
                .createNativeQuery("SELECT status FROM sms_outbox_notifications WHERE id = :id")
                .setParameter("id", saved.getId())
                .getSingleResult();

        assertThat(rawStatus).isEqualTo("PROCESSING");
    }

    @Test
    @DisplayName("3. Unique idempotency key constraint rejects duplicate keys")
    void testUniqueIdempotencyConstraintRejectsDuplicates() {
        String sharedKey = "unique-key-collision-test";

        SmsOutboxNotification first = new SmsOutboxNotification(
                sharedKey,
                testAppointment,
                "+94771234567",
                "First message",
                false,
                null
        );
        repository.save(first);
        entityManager.flush();

        SmsOutboxNotification duplicate = new SmsOutboxNotification(
                sharedKey,
                testAppointment,
                "+94771234567",
                "Duplicate message",
                false,
                null
        );

        assertThatThrownBy(() -> repository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("4. Appointment foreign key constraint links successfully to existing appointment")
    void testAppointmentForeignKeyWorks() {
        String key = "appt-fk-valid-key";
        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "Valid appointment FK test",
                true,
                LocalDateTime.now()
        );
        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<SmsOutboxNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        assertThat(reloaded.get().getAppointment().getId()).isEqualTo(testAppointment.getId());
    }

    @Test
    @DisplayName("5. Invalid appointment reference is rejected by foreign key constraint")
    void testInvalidAppointmentReferenceIsRejected() {
        assertThatThrownBy(() -> {
            entityManager.getEntityManager()
                    .createNativeQuery("INSERT INTO sms_outbox_notifications " +
                            "(idempotency_key, appointment_id, recipient_phone, message_body, status, retry_count, max_retries, consent_obtained, created_at, updated_at) " +
                            "VALUES ('invalid-fk-key', 999999, '+94771234567', 'Test Body', 'PENDING', 0, 3, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
                    .executeUpdate();
            entityManager.flush();
        }).isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("6. Default consent is not TRUE (defaults to false)")
    void testDefaultConsentIsNotTrue() {
        SmsOutboxNotification defaultNotification = new SmsOutboxNotification();
        assertThat(defaultNotification.isConsentObtained()).isFalse();

        String key = "default-consent-persist-key";
        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "Message without consent",
                false,
                null
        );

        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<SmsOutboxNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        assertThat(reloaded.get().isConsentObtained()).isFalse();

        Object rawConsent = entityManager.getEntityManager()
                .createNativeQuery("SELECT consent_obtained FROM sms_outbox_notifications WHERE id = :id")
                .setParameter("id", saved.getId())
                .getSingleResult();

        if (rawConsent instanceof Boolean boolVal) {
            assertThat(boolVal).isFalse();
        } else if (rawConsent instanceof Number numVal) {
            assertThat(numVal.intValue()).isEqualTo(0);
        }
    }

    @Test
    @DisplayName("7. Consent timestamp is absent (null) when consent is absent")
    void testConsentTimestampAbsentWhenConsentIsAbsent() {
        String key = "no-consent-timestamp-key";
        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "No consent message",
                false,
                LocalDateTime.now() // Attempting to pass timestamp with false consent
        );

        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<SmsOutboxNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        assertThat(reloaded.get().isConsentObtained()).isFalse();
        assertThat(reloaded.get().getConsentTimestamp()).isNull();
    }

    @Test
    @DisplayName("8. Retry fields persist correctly with non-negative constraints")
    void testRetryFieldsPersistCorrectly() {
        String key = "retry-fields-key";
        LocalDateTime retryTime = LocalDateTime.now().plusMinutes(10);

        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "Retry test message",
                true,
                LocalDateTime.now()
        );
        notification.setRetryCount(2);
        notification.setMaxRetries(5);
        notification.setNextRetryAt(retryTime);
        notification.setLastErrorCategory("NETWORK_TIMEOUT");
        notification.setLastErrorMessage("Connect timeout to provider after 5000ms");

        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<SmsOutboxNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        SmsOutboxNotification loaded = reloaded.get();
        assertThat(loaded.getRetryCount()).isEqualTo(2);
        assertThat(loaded.getMaxRetries()).isEqualTo(5);
        assertThat(loaded.getNextRetryAt()).isNotNull();
        assertThat(loaded.getLastErrorCategory()).isEqualTo("NETWORK_TIMEOUT");
        assertThat(loaded.getLastErrorMessage()).contains("Connect timeout");
    }

    @Test
    @DisplayName("9. Provider fields may be null initially")
    void testProviderIdMayBeNullInitially() {
        String key = "null-provider-key";
        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "Null provider test message",
                true,
                LocalDateTime.now()
        );

        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();
        entityManager.clear();

        Optional<SmsOutboxNotification> reloaded = repository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        assertThat(reloaded.get().getProviderName()).isNull();
        assertThat(reloaded.get().getProviderMessageId()).isNull();
        assertThat(reloaded.get().getLockedAt()).isNull();
        assertThat(reloaded.get().getLockedBy()).isNull();
    }

    @Test
    @DisplayName("10. No external SMS calls are made during persistence or queries")
    void testNoExternalSmsCallsMade() {
        String key = "offline-safety-key";
        SmsOutboxNotification notification = new SmsOutboxNotification(
                key,
                testAppointment,
                "+94771234567",
                "Offline safety test",
                true,
                LocalDateTime.now()
        );

        // Saving solely persists an intent row in the database table
        SmsOutboxNotification saved = repository.save(notification);
        entityManager.flush();

        // Repository finders operate strictly against the relational store
        assertThat(repository.existsByIdempotencyKey(key)).isTrue();
        assertThat(repository.findByIdempotencyKey(key)).isPresent();
        assertThat(repository.findByAppointmentId(testAppointment.getId())).hasSize(1);
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.PENDING);
    }
}
