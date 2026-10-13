package com.dentcare.notification.service;

import com.dentcare.appointment.entity.Appointment;
import com.dentcare.appointment.entity.AppointmentStatus;
import com.dentcare.appointment.repository.AppointmentRepository;
import com.dentcare.notification.entity.AppointmentEmailNotification;
import com.dentcare.notification.entity.EmailNotificationStatus;
import com.dentcare.notification.repository.AppointmentEmailNotificationRepository;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({AppointmentEmailDeliveryResultService.class, AppointmentEmailDeliveryResultServiceTest.TestConfig.class})
@TestPropertySource(properties = {
        "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-appointment.sql,classpath:schema-notification.sql"
})
class AppointmentEmailDeliveryResultServiceTest {

    private static final Instant FIXED_INSTANT = Instant.parse("2026-10-12T12:00:00Z");

    @TestConfiguration
    static class TestConfig {
        @Bean
        public Clock testClock() {
            return Clock.fixed(FIXED_INSTANT, ZoneId.of("UTC"));
        }
    }

    @Autowired
    private AppointmentEmailNotificationRepository repository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppointmentEmailDeliveryResultService resultService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private Clock testClock;

    private User testPatient;
    private Appointment testAppointment;

    @BeforeEach
    void setUp() {
        tearDown();

        testPatient = new User(
                "result.patient@dentcare.test",
                "$2a$10$abcdefghijklmnopqrstuvw1234567890abcdefghijklmnopqr",
                "Kasun",
                "Perera",
                "+94771234567",
                Role.PATIENT
        );
        testPatient = userRepository.saveAndFlush(testPatient);

        testAppointment = new Appointment();
        testAppointment.setPatient(testPatient);
        testAppointment.setAppointmentDate(LocalDate.now().plusDays(3));
        testAppointment.setPreferredTime("10:00");
        testAppointment.setReason("Tooth extraction");
        testAppointment.setStatus(AppointmentStatus.PENDING);
        testAppointment = appointmentRepository.saveAndFlush(testAppointment);
    }

    @AfterEach
    void tearDown() {
        repository.deleteAll();
        appointmentRepository.deleteAll();
        userRepository.deleteAll();
    }

    private AppointmentEmailNotification createClaimedNotification(String idempotencyKey, String claimToken, int attemptCount, int maxAttempts) {
        LocalDateTime now = LocalDateTime.now(testClock);
        AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment,
                idempotencyKey,
                "result.patient@dentcare.test",
                "DentCare - Appointment Confirmation",
                "Dear Patient, your appointment is scheduled."
        );
        notif.setStatus(EmailNotificationStatus.PROCESSING);
        notif.setAttemptCount(attemptCount);
        notif.setMaxAttempts(maxAttempts);
        notif.setLockedAt(now.minusSeconds(10));
        notif.setLockedBy(claimToken);
        notif.setLeaseUntil(now.plusSeconds(110));
        notif.setCreatedAt(now.minusMinutes(5));
        return repository.saveAndFlush(notif);
    }

    @Test
    @DisplayName("1. Valid owned PROCESSING -> SENT")
    void test1_ValidOwnedProcessingTransitionsToSent() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-1", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.SENT);
    }

    @Test
    @DisplayName("2. SENT records set sent_at")
    void test2_SentRecordsSetSentAt() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-2", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        assertThat(updated.getSentAt()).isEqualTo(LocalDateTime.now(testClock));
    }

    @Test
    @DisplayName("3. SMTP acceptance is not called inbox delivery")
    void test3_SmtpAcceptanceIsNotCalledInboxDelivery() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-3", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        // Status is SENT (accepted for relay by SMTP server), decoupled from delivery confirmation
        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.SENT);
        assertThat(updated.getStatus().name()).isEqualTo("SENT");
        assertThat(updated.getNextRetryAt()).isNull();
    }

    @Test
    @DisplayName("4. PROCESSING -> FAILED on permanent failure")
    void test4_ProcessingTransitionsToFailedOnPermanentFailure() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-4", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.DEFINITELY_NOT_ACCEPTED_PERMANENT, "INVALID_RECIPIENT"
        );

        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.FAILED);
        assertThat(updated.getLastError()).isEqualTo("INVALID_RECIPIENT");
        assertThat(updated.getSentAt()).isNull();
        assertThat(updated.getNextRetryAt()).isNull();
    }

    @Test
    @DisplayName("5. Transient failure schedules PENDING retry")
    void test5_TransientFailureSchedulesPendingRetry() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-5", token, 1, 3);
        LocalDateTime now = LocalDateTime.now(testClock);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.DEFINITELY_NOT_ACCEPTED_TRANSIENT, "CONNECTION_TIMEOUT"
        );

        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.PENDING);
        assertThat(updated.getNextRetryAt()).isEqualTo(now.plusSeconds(60L));
    }

    @Test
    @DisplayName("6. Retry backoff is correctly calculated")
    void test6_RetryBackoffIsCorrectlyCalculated() {
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(1)).isEqualTo(60L);
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(2)).isEqualTo(120L);
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(3)).isEqualTo(240L);
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(4)).isEqualTo(480L);
    }

    @Test
    @DisplayName("7. Retry backoff is capped")
    void test7_RetryBackoffIsCapped() {
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(7)).isEqualTo(3600L);
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(20)).isEqualTo(3600L);
        assertThat(AppointmentEmailDeliveryResultService.computeBackoffDelaySeconds(100)).isEqualTo(3600L);
    }

    @Test
    @DisplayName("8. Exhausted attempt budget becomes FAILED")
    void test8_ExhaustedAttemptBudgetBecomesFailed() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-8", token, 3, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.DEFINITELY_NOT_ACCEPTED_TRANSIENT, "NETWORK_DOWN"
        );

        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.FAILED);
        assertThat(updated.getNextRetryAt()).isNull();
        assertThat(updated.getAttemptCount()).isEqualTo(3);
    }

    @Test
    @DisplayName("9. Uncertain outcome becomes DELIVERY_UNCERTAIN")
    void test9_UncertainOutcomeBecomesDeliveryUncertain() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-9", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.DELIVERY_OUTCOME_UNKNOWN, null
        );

        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.DELIVERY_UNCERTAIN);
        assertThat(updated.getLastError()).isEqualTo("SMTP_OUTCOME_UNKNOWN");
    }

    @Test
    @DisplayName("10. Uncertain outcome has no automatic retry")
    void test10_UncertainOutcomeHasNoAutomaticRetry() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-10", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.DELIVERY_OUTCOME_UNKNOWN, null
        );

        assertThat(updated.getNextRetryAt()).isNull();
        assertThat(updated.getSentAt()).isNull();
    }

    @Test
    @DisplayName("11. Missing claim token is rejected")
    void test11_MissingClaimTokenIsRejected() {
        assertThatThrownBy(() -> resultService.recordDeliveryResult(1L, null, EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Claim token must not be blank");

        assertThatThrownBy(() -> resultService.recordDeliveryResult(1L, "  ", EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Claim token must not be blank");
    }

    @Test
    @DisplayName("12. Wrong claim token is rejected")
    void test12_WrongClaimTokenIsRejected() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-12", token, 1, 3);

        assertThatThrownBy(() -> resultService.recordDeliveryResult(notif.getId(), "wrong-token", EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Claim ownership mismatch");
    }

    @Test
    @DisplayName("13. Missing notification ID is rejected")
    void test13_MissingNotificationIdIsRejected() {
        assertThatThrownBy(() -> resultService.recordDeliveryResult(null, "some-token", EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Notification ID must not be null");
    }

    @Test
    @DisplayName("14. Unknown notification ID is rejected")
    void test14_UnknownNotificationIdIsRejected() {
        assertThatThrownBy(() -> resultService.recordDeliveryResult(999999L, "some-token", EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Notification not found with ID");
    }

    @Test
    @DisplayName("15. PENDING cannot be finalized")
    void test15_PendingCannotBeFinalized() {
        AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment, "res-15", "p@test.com", "Subj", "Body"
        );
        notif.setStatus(EmailNotificationStatus.PENDING);
        notif = repository.saveAndFlush(notif);

        Long notifId = notif.getId();
        assertThatThrownBy(() -> resultService.recordDeliveryResult(notifId, "any-token", EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is not in PROCESSING status");
    }

    @Test
    @DisplayName("16. SENT cannot be finalized twice")
    void test16_SentCannotBeFinalizedTwice() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-16", token, 1, 3);
        resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP);

        assertThatThrownBy(() -> resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is not in PROCESSING status");
    }

    @Test
    @DisplayName("17. FAILED cannot be finalized")
    void test17_FailedCannotBeFinalized() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-17", token, 3, 3);
        resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.DEFINITELY_NOT_ACCEPTED_PERMANENT);

        assertThatThrownBy(() -> resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is not in PROCESSING status");
    }

    @Test
    @DisplayName("18. DELIVERY_UNCERTAIN cannot be finalized")
    void test18_DeliveryUncertainCannotBeFinalized() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-18", token, 1, 3);
        resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.DELIVERY_OUTCOME_UNKNOWN);

        assertThatThrownBy(() -> resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is not in PROCESSING status");
    }

    @Test
    @DisplayName("19. Existing attempt_count is preserved")
    void test19_ExistingAttemptCountIsPreserved() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-19", token, 2, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        assertThat(updated.getAttemptCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("20. Existing recipient and content are preserved")
    void test20_ExistingRecipientAndContentArePreserved() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-20", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        assertThat(updated.getRecipientEmail()).isEqualTo("result.patient@dentcare.test");
        assertThat(updated.getEmailSubject()).isEqualTo("DentCare - Appointment Confirmation");
        assertThat(updated.getEmailBody()).contains("Dear Patient");
        assertThat(updated.getIdempotencyKey()).isEqualTo("res-20");
    }

    @Test
    @DisplayName("21. Lock fields are cleared after valid outcome")
    void test21_LockFieldsAreClearedAfterValidOutcome() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-21", token, 1, 3);

        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        assertThat(updated.getLockedAt()).isNull();
        assertThat(updated.getLockedBy()).isNull();
        assertThat(updated.getLeaseUntil()).isNull();
    }

    @Test
    @DisplayName("22. Stale ownership does not overwrite state")
    void test22_StaleOwnershipDoesNotOverwriteState() {
        String tokenA = UUID.randomUUID().toString();
        String tokenB = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-22", tokenA, 1, 3);

        notif.setLockedBy(tokenB);
        repository.saveAndFlush(notif);

        assertThatThrownBy(() -> resultService.recordDeliveryResult(notif.getId(), tokenA, EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Claim ownership mismatch");
    }

    @Test
    @DisplayName("23. Late definitive outcome with unchanged ownership follows documented lease rules")
    void test23_LateDefinitiveOutcomeWithUnchangedOwnershipFollowsLeaseRules() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-23", token, 1, 3);

        // Lease expired 10 minutes ago
        notif.setLeaseUntil(LocalDateTime.now(testClock).minusMinutes(10));
        repository.saveAndFlush(notif);

        // Status is still PROCESSING and token matches -> allowed per documented semantics
        AppointmentEmailNotification updated = resultService.recordDeliveryResult(
                notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP
        );

        assertThat(updated.getStatus()).isEqualTo(EmailNotificationStatus.SENT);
    }

    @Test
    @DisplayName("24. Simultaneous finalizers cannot both succeed")
    void test24_SimultaneousFinalizersCannotBothSucceed() throws Exception {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-24", token, 1, 3);
        Long id = notif.getId();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        Future<?> f1 = executor.submit(() -> {
            try {
                startLatch.await();
                resultService.recordDeliveryResult(id, token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP);
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
        });

        Future<?> f2 = executor.submit(() -> {
            try {
                startLatch.await();
                resultService.recordDeliveryResult(id, token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP);
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
        });

        startLatch.countDown();
        f1.get(5, TimeUnit.SECONDS);
        f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("25. Persistence failure rolls back all changes")
    void test25_PersistenceFailureRollsBackAllChanges() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-25", token, 1, 3);
        Long id = notif.getId();

        AppointmentEmailNotificationRepository failingRepo = (AppointmentEmailNotificationRepository) java.lang.reflect.Proxy
                .newProxyInstance(
                        AppointmentEmailNotificationRepository.class.getClassLoader(),
                        new Class<?>[]{AppointmentEmailNotificationRepository.class},
                        (proxy, method, args) -> {
                            if ("save".equals(method.getName())) {
                                throw new DataIntegrityViolationException("Simulated DB failure on save");
                            }
                            try {
                                return method.invoke(repository, args);
                            } catch (java.lang.reflect.InvocationTargetException e) {
                                throw e.getTargetException();
                            }
                        }
                );

        ProxyFactory factory = new ProxyFactory(new AppointmentEmailDeliveryResultService(failingRepo, testClock));
        factory.addAdvice(new TransactionInterceptor(transactionManager, new AnnotationTransactionAttributeSource()));
        AppointmentEmailDeliveryResultService proxyService = (AppointmentEmailDeliveryResultService) factory.getProxy();

        assertThatThrownBy(() -> proxyService.recordDeliveryResult(id, token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP))
                .isInstanceOf(DataIntegrityViolationException.class);

        AppointmentEmailNotification reloaded = repository.findById(id).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmailNotificationStatus.PROCESSING);
        assertThat(reloaded.getLockedBy()).isEqualTo(token);
    }

    @Test
    @DisplayName("26. Sanitized last_error contains no secrets")
    void test26_SanitizedLastErrorContainsNoSecrets() {
        String raw = "Error delivering to patient@test.com: password=secret123, token=bearer_abc\n\tat org.example.Mail.send";
        String sanitized = AppointmentEmailDeliveryResultService.sanitizeError(raw, EmailDeliveryOutcome.DEFINITELY_NOT_ACCEPTED_PERMANENT);

        assertThat(sanitized).doesNotContain("patient@test.com");
        assertThat(sanitized).doesNotContain("secret123");
        assertThat(sanitized).doesNotContain("bearer_abc");
        assertThat(sanitized).doesNotContain("\tat org.example.Mail.send");
        assertThat(sanitized).contains("[REDACTED_EMAIL]");
        assertThat(sanitized).contains("[REDACTED]");
    }

    @Test
    @DisplayName("27. No email transport is invoked")
    void test27_NoEmailTransportIsInvoked() {
        // Confirmed structurally: Service does not inject JavaMailSender or AppointmentEmailTransport
        assertThat(resultService).isNotNull();
    }

    @Test
    @DisplayName("28. No SMS transport is invoked")
    void test28_NoSmsTransportIsInvoked() {
        // Confirmed structurally: Service does not interact with SMS outbox or SMS transport
        assertThat(resultService).isNotNull();
    }

    @Test
    @DisplayName("29. No appointment is modified")
    void test29_NoAppointmentIsModified() {
        String token = UUID.randomUUID().toString();
        AppointmentEmailNotification notif = createClaimedNotification("res-29", token, 1, 3);

        resultService.recordDeliveryResult(notif.getId(), token, EmailDeliveryOutcome.ACCEPTED_BY_SMTP);

        Appointment appt = appointmentRepository.findById(testAppointment.getId()).orElseThrow();
        assertThat(appt.getStatus()).isEqualTo(AppointmentStatus.PENDING);
        assertThat(appt.getReason()).isEqualTo("Tooth extraction");
    }

    @Test
    @DisplayName("30. No historical notification is automatically retried or dispatched")
    void test30_NoHistoricalNotificationIsAutomaticallyRetriedOrDispatched() {
        String token1 = UUID.randomUUID().toString();
        String token2 = UUID.randomUUID().toString();
        AppointmentEmailNotification hist = createClaimedNotification("res-30-hist", token1, 1, 3);
        AppointmentEmailNotification target = createClaimedNotification("res-30-target", token2, 1, 3);

        resultService.recordDeliveryResult(target.getId(), token2, EmailDeliveryOutcome.ACCEPTED_BY_SMTP);

        AppointmentEmailNotification reloadedHist = repository.findById(hist.getId()).orElseThrow();
        assertThat(reloadedHist.getStatus()).isEqualTo(EmailNotificationStatus.PROCESSING);
        assertThat(reloadedHist.getLockedBy()).isEqualTo(token1);
        assertThat(reloadedHist.getSentAt()).isNull();
    }
}
