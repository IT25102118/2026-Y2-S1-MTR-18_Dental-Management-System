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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import org.mockito.Mockito;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({ AppointmentEmailClaimService.class, AppointmentEmailClaimServiceTest.TestConfig.class })
@TestPropertySource(properties = {
        "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-appointment.sql,classpath:schema-notification.sql"
})
class AppointmentEmailClaimServiceTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public Clock testClock() {
            return Clock.fixed(Instant.parse("2026-10-11T12:00:00Z"), ZoneId.systemDefault());
        }
    }

    @Autowired
    private AppointmentEmailNotificationRepository repository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppointmentEmailClaimService claimService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private Clock fixedClock;

    private User testPatient;
    private Appointment testAppointment;

    @BeforeEach
    void setUp() {
        tearDown();

        testPatient = new User(
                "patient.claim@dentcare.test",
                "$2a$10$abcdefghijklmnopqrstuvw1234567890abcdefghijklmnopqr",
                "Kasun",
                "Perera",
                "+94771234567",
                Role.PATIENT);
        testPatient = userRepository.saveAndFlush(testPatient);

        testAppointment = new Appointment();
        testAppointment.setPatient(testPatient);
        testAppointment.setAppointmentDate(LocalDate.now().plusDays(3));
        testAppointment.setPreferredTime("09:30");
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

    private AppointmentEmailNotification createNotification(
            String idempotencyKey,
            EmailNotificationStatus status,
            int attemptCount,
            int maxAttempts,
            LocalDateTime nextRetryAt,
            LocalDateTime createdAt) {
        AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment,
                idempotencyKey,
                "patient.claim@dentcare.test",
                "DentCare - Appointment Confirmation",
                "Dear Patient, your appointment is scheduled.");
        notif.setStatus(status);
        notif.setAttemptCount(attemptCount);
        notif.setMaxAttempts(maxAttempts);
        notif.setNextRetryAt(nextRetryAt);
        if (createdAt != null) {
            notif.setCreatedAt(createdAt);
        }
        return notif;
    }

    @Test
    @DisplayName("1-6. Eligible PENDING record is claimed: status=PROCESSING, locked_at/by/lease set, attempt_count incremented")
    void testClaimEligiblePendingNotification() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif = createNotification(
                "claim-key-1",
                EmailNotificationStatus.PENDING,
                0,
                3,
                null,
                now.minusMinutes(30));
        notif = repository.saveAndFlush(notif);
        Long notifId = notif.getId();

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result).isNotNull();
        assertThat(result.claimedCount()).isEqualTo(1);
        assertThat(result.claimedNotificationIds()).containsExactly(notifId);
        assertThat(result.claimToken()).isNotBlank();
        assertThat(result.leaseUntil()).isEqualTo(now.plusSeconds(120L));

        AppointmentEmailNotification reloaded = repository.findById(notifId).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmailNotificationStatus.PROCESSING);
        assertThat(reloaded.getLockedAt()).isEqualTo(now);
        assertThat(reloaded.getLockedBy()).isEqualTo(result.claimToken());
        assertThat(reloaded.getLeaseUntil()).isEqualTo(result.leaseUntil());
        assertThat(reloaded.getAttemptCount()).isEqualTo(1); // incremented from 0 to 1
        assertThat(reloaded.getMaxAttempts()).isEqualTo(3);
        assertThat(reloaded.getSentAt()).isNull();
        assertThat(reloaded.getRecipientEmail()).isEqualTo("patient.claim@dentcare.test");
        assertThat(reloaded.getEmailSubject()).isEqualTo("DentCare - Appointment Confirmation");
        assertThat(reloaded.getEmailBody()).contains("Dear Patient");
        assertThat(reloaded.getAppointment().getId()).isEqualTo(testAppointment.getId());
        Appointment appt = appointmentRepository.findById(testAppointment.getId()).orElseThrow();
        assertThat(appt.getStatus()).isEqualTo(AppointmentStatus.PENDING);
    }

    @Test
    @DisplayName("7. Retry budget is enforced: attempt_count >= max_attempts is excluded")
    void testRetryBudgetExhaustedExcluded() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification exhausted = createNotification(
                "claim-key-exhausted",
                EmailNotificationStatus.PENDING,
                3,
                3, // attempt_count == max_attempts
                null,
                now.minusMinutes(10));
        repository.saveAndFlush(exhausted);

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(0);
        assertThat(result.claimedNotificationIds()).isEmpty();
    }

    @Test
    @DisplayName("8-10. next_retry_at rules: future excluded, due included, null included")
    void testNextRetryAtEligibility() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        // Future next_retry_at -> excluded
        AppointmentEmailNotification futureRetry = createNotification(
                "claim-future-retry",
                EmailNotificationStatus.PENDING,
                1,
                3,
                now.plusMinutes(5),
                now.minusMinutes(20));
        repository.saveAndFlush(futureRetry);

        // Due next_retry_at -> included
        AppointmentEmailNotification dueRetry = createNotification(
                "claim-due-retry",
                EmailNotificationStatus.PENDING,
                1,
                3,
                now.minusMinutes(2),
                now.minusMinutes(20));
        dueRetry = repository.saveAndFlush(dueRetry);

        // Null next_retry_at -> included
        AppointmentEmailNotification nullRetry = createNotification(
                "claim-null-retry",
                EmailNotificationStatus.PENDING,
                0,
                3,
                null,
                now.minusMinutes(10));
        nullRetry = repository.saveAndFlush(nullRetry);

        Long dueId = dueRetry.getId();
        Long nullId = nullRetry.getId();

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(2);
        assertThat(result.claimedNotificationIds()).containsExactlyInAnyOrder(dueId, nullId);
        assertThat(result.claimedNotificationIds()).doesNotContain(futureRetry.getId());
    }

    @Test
    @DisplayName("11. Pre-activation records created before cutoff are excluded")
    void testPreActivationBacklogExcluded() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusMinutes(15);

        // Old historical backlog item
        AppointmentEmailNotification historical = createNotification(
                "claim-historical",
                EmailNotificationStatus.PENDING,
                0,
                3,
                null,
                now.minusMinutes(45) // before cutoff
        );
        repository.saveAndFlush(historical);

        // New item created after activation cutoff
        AppointmentEmailNotification current = createNotification(
                "claim-current",
                EmailNotificationStatus.PENDING,
                0,
                3,
                null,
                now.minusMinutes(5) // after cutoff
        );
        current = repository.saveAndFlush(current);

        Long currentId = current.getId();

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(1);
        assertThat(result.claimedNotificationIds()).containsExactly(currentId);
        assertThat(result.claimedNotificationIds()).doesNotContain(historical.getId());
    }

    @Test
    @DisplayName("12-15. Non-PENDING records (SENT, FAILED, PROCESSING, DELIVERY_UNCERTAIN) are excluded")
    void testNonPendingRecordsExcluded() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification sent = createNotification("key-sent", EmailNotificationStatus.SENT, 1, 3, null,
                now);
        AppointmentEmailNotification failed = createNotification("key-failed", EmailNotificationStatus.FAILED, 3, 3,
                null, now);
        AppointmentEmailNotification processing = createNotification("key-proc", EmailNotificationStatus.PROCESSING, 1,
                3, null, now);
        AppointmentEmailNotification uncertain = createNotification("key-uncert",
                EmailNotificationStatus.DELIVERY_UNCERTAIN, 1, 3, null, now);

        repository.saveAndFlush(sent);
        repository.saveAndFlush(failed);
        repository.saveAndFlush(processing);
        repository.saveAndFlush(uncertain);

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(0);
        assertThat(result.claimedNotificationIds()).isEmpty();
    }

    @Test
    @DisplayName("16. Expired PROCESSING lease is NOT re-claimed automatically")
    void testExpiredProcessingLeaseNotReclaimed() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification expiredProc = createNotification(
                "claim-expired-proc",
                EmailNotificationStatus.PROCESSING,
                1,
                3,
                null,
                now.minusMinutes(30));
        expiredProc.setLockedAt(now.minusMinutes(10));
        expiredProc.setLockedBy("worker-crashed");
        expiredProc.setLeaseUntil(now.minusMinutes(5)); // expired!
        repository.saveAndFlush(expiredProc);

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(0);
        assertThat(result.claimedNotificationIds()).isEmpty();
    }

    @Test
    @DisplayName("17. Empty batch returns no claimed IDs and hasClaims=false")
    void testEmptyBatch() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(0);
        assertThat(result.claimedNotificationIds()).isEmpty();
        assertThat(result.hasClaims()).isFalse();
        assertThat(result.claimToken()).isNotBlank();
        assertThat(result.leaseUntil()).isEqualTo(now.plusSeconds(120L));
    }

    @Test
    @DisplayName("18. Invalid batch size is rejected")
    void testInvalidBatchSizeRejected() {
        LocalDateTime cutoff = LocalDateTime.now(fixedClock).minusHours(1);

        assertThatThrownBy(() -> claimService.claimPendingEmails(cutoff, 0, 120L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Batch size must be between");

        assertThatThrownBy(() -> claimService.claimPendingEmails(cutoff, -1, 120L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Batch size must be between");

        assertThatThrownBy(() -> claimService.claimPendingEmails(cutoff, 51, 120L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Batch size must be between");
    }

    @Test
    @DisplayName("19. Invalid lease duration is rejected")
    void testInvalidLeaseDurationRejected() {
        LocalDateTime cutoff = LocalDateTime.now(fixedClock).minusHours(1);

        assertThatThrownBy(() -> claimService.claimPendingEmails(cutoff, 10, 0L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Lease duration must be between");

        assertThatThrownBy(() -> claimService.claimPendingEmails(cutoff, 10, -5L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Lease duration must be between");

        assertThatThrownBy(() -> claimService.claimPendingEmails(cutoff, 10, 3601L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Lease duration must be between");
    }

    @Test
    @DisplayName("20. Null activation cutoff is rejected")
    void testNullActivationCutoffRejected() {
        assertThatThrownBy(() -> claimService.claimPendingEmails(null, 10, 120L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Activation cutoff must not be null");
    }

    @Test
    @DisplayName("21. Different claim calls receive different unique tokens")
    void testDifferentClaimCallsReceiveUniqueTokens() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif1 = createNotification("token-test-1", EmailNotificationStatus.PENDING, 0, 3,
                null, now);
        AppointmentEmailNotification notif2 = createNotification("token-test-2", EmailNotificationStatus.PENDING, 0, 3,
                null, now);
        repository.saveAndFlush(notif1);
        repository.saveAndFlush(notif2);

        AppointmentEmailClaimResult res1 = claimService.claimPendingEmails(cutoff, 1, 120L);
        AppointmentEmailClaimResult res2 = claimService.claimPendingEmails(cutoff, 1, 120L);

        assertThat(res1.claimToken()).isNotBlank();
        assertThat(res2.claimToken()).isNotBlank();
        assertThat(res1.claimToken()).isNotEqualTo(res2.claimToken());
    }

    @Test
    @DisplayName("22. Two sequential claim calls cannot claim the same row twice")
    void testSequentialClaimsCannotClaimSameRowTwice() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif = createNotification("seq-claim-1", EmailNotificationStatus.PENDING, 0, 3,
                null, now);
        notif = repository.saveAndFlush(notif);
        Long id = notif.getId();

        AppointmentEmailClaimResult firstClaim = claimService.claimPendingEmails(cutoff, 10, 120L);
        assertThat(firstClaim.claimedNotificationIds()).containsExactly(id);

        // Second call immediately after: row is now PROCESSING, cannot be claimed again
        AppointmentEmailClaimResult secondClaim = claimService.claimPendingEmails(cutoff, 10, 120L);
        assertThat(secondClaim.claimedNotificationIds()).isEmpty();
        assertThat(secondClaim.claimedCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("23a. REQUIRES_NEW: Caller transaction rollback does not roll back independently committed claim")
    void testCallerTransactionRollbackDoesNotAffectClaim() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif = createNotification("rollback-test-1", EmailNotificationStatus.PENDING, 0,
                3, null, now);
        notif = repository.saveAndFlush(notif);
        Long notifId = notif.getId();

        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> transactionTemplate.execute(status -> {
            claimService.claimPendingEmails(cutoff, 10, 120L);
            throw new RuntimeException("Simulated catastrophic crash in caller prior to commit");
        })).isInstanceOf(RuntimeException.class).hasMessageContaining("Simulated catastrophic crash in caller");

        AppointmentEmailNotification reloaded = repository.findById(notifId).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmailNotificationStatus.PROCESSING);
        assertThat(reloaded.getAttemptCount()).isEqualTo(1);
        assertThat(reloaded.getLockedAt()).isEqualTo(now);
        assertThat(reloaded.getLockedBy()).isNotBlank();
        assertThat(reloaded.getLeaseUntil()).isNotNull();
    }

    @Test
    @DisplayName("23b. Failure within claim transaction rolls back changes atomically")
    void testFailureInsideClaimTransactionRollsBackAtomically() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif = createNotification("rollback-fail-1", EmailNotificationStatus.PENDING, 0,
                3, null, now);
        notif = repository.saveAndFlush(notif);
        Long notifId = notif.getId();

        AppointmentEmailNotificationRepository failingRepo = (AppointmentEmailNotificationRepository) java.lang.reflect.Proxy
                .newProxyInstance(
                        AppointmentEmailNotificationRepository.class.getClassLoader(),
                        new Class<?>[] { AppointmentEmailNotificationRepository.class },
                        (proxy, method, args) -> {
                            if ("saveAll".equals(method.getName())) {
                                throw new DataIntegrityViolationException(
                                        "Simulated DB integrity failure during saveAll");
                            }
                            try {
                                return method.invoke(repository, args);
                            } catch (java.lang.reflect.InvocationTargetException e) {
                                throw e.getTargetException();
                            }
                        });

        ProxyFactory factory = new ProxyFactory(
                new AppointmentEmailClaimService(failingRepo, fixedClock));
        factory.addAdvice(new TransactionInterceptor(
                transactionManager,
                new AnnotationTransactionAttributeSource()));
        AppointmentEmailClaimService proxyClaimService = (AppointmentEmailClaimService) factory.getProxy();

        assertThatThrownBy(() -> proxyClaimService.claimPendingEmails(cutoff, 10, 120L))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("Simulated DB integrity failure");

        AppointmentEmailNotification reloaded = repository.findById(notifId).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmailNotificationStatus.PENDING);
        assertThat(reloaded.getAttemptCount()).isEqualTo(0);
        assertThat(reloaded.getLockedAt()).isNull();
        assertThat(reloaded.getLockedBy()).isNull();
        assertThat(reloaded.getLeaseUntil()).isNull();
    }

    @Test
    @DisplayName("24. Bounded batch size is respected: only batchSize records claimed")
    void testBatchSizeRespected() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        for (int i = 0; i < 5; i++) {
            AppointmentEmailNotification notif = createNotification("batch-test-" + i, EmailNotificationStatus.PENDING,
                    0, 3, null, now);
            repository.saveAndFlush(notif);
        }

        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 2, 120L); // batchSize = 2

        assertThat(result.claimedCount()).isEqualTo(2);
        assertThat(result.claimedNotificationIds()).hasSize(2);
    }

    @Test
    @DisplayName("25. Concurrent claim workers safely partition rows without overlap")
    void testConcurrentWorkersClaimDistinctRows() throws Exception {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        for (int i = 0; i < 4; i++) {
            AppointmentEmailNotification notif = createNotification("conc-test-" + i, EmailNotificationStatus.PENDING,
                    0, 3, null, now);
            repository.saveAndFlush(notif);
        }

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicReference<AppointmentEmailClaimResult> res1Ref = new AtomicReference<>();
        AtomicReference<AppointmentEmailClaimResult> res2Ref = new AtomicReference<>();

        Future<?> f1 = executor.submit(() -> {
            try {
                startLatch.await();
                AppointmentEmailClaimResult res = claimService.claimPendingEmails(cutoff, 2, 120L);
                res1Ref.set(res);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        Future<?> f2 = executor.submit(() -> {
            try {
                startLatch.await();
                AppointmentEmailClaimResult res = claimService.claimPendingEmails(cutoff, 2, 120L);
                res2Ref.set(res);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        startLatch.countDown();
        f1.get(5, TimeUnit.SECONDS);
        f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        AppointmentEmailClaimResult res1 = res1Ref.get();
        AppointmentEmailClaimResult res2 = res2Ref.get();

        assertThat(res1).isNotNull();
        assertThat(res2).isNotNull();
        assertThat(res1.claimToken()).isNotEqualTo(res2.claimToken());

        // Zero overlap between claimed IDs
        for (Long id : res1.claimedNotificationIds()) {
            assertThat(res2.claimedNotificationIds()).doesNotContain(id);
        }
    }
}
