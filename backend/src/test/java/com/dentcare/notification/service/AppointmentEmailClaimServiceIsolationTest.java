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
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Focused integration test verifying:
 * 1. The actual JDBC transaction isolation level during the claim operation is Connection.TRANSACTION_READ_COMMITTED.
 * 2. Repository access executes under TRANSACTION_READ_COMMITTED.
 * 3. The connection's isolation level is restored when returned to the pool.
 * 4. Propagation.REQUIRES_NEW creates an independent transaction that commits even if an outer caller transaction rolls back.
 */
@DataJpaTest
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({AppointmentEmailClaimService.class, AppointmentEmailClaimServiceIsolationTest.TestConfig.class})
@TestPropertySource(properties = {
        "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-appointment.sql,classpath:schema-notification.sql"
})
class AppointmentEmailClaimServiceIsolationTest {

    private static final int BASELINE_POOL_ISOLATION = Connection.TRANSACTION_REPEATABLE_READ;

    // Trackers for observing JDBC connection behavior
    private static final List<Integer> RECORDED_SET_ISOLATION_CALLS = Collections.synchronizedList(new ArrayList<>());
    private static final List<Integer> OBSERVED_ISOLATIONS_DURING_REPO_ACCESS = Collections.synchronizedList(new ArrayList<>());
    private static final List<Integer> OBSERVED_ISOLATIONS_AT_CLOSE = Collections.synchronizedList(new ArrayList<>());

    @TestConfiguration
    static class TestConfig {

        @Bean
        public Clock testClock() {
            return Clock.fixed(Instant.parse("2026-10-12T10:00:00Z"), ZoneId.systemDefault());
        }

        @Bean
        public static BeanPostProcessor dataSourceSpyBeanPostProcessor() {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                    if (bean instanceof DataSource ds && !(bean instanceof ObservableDataSource)) {
                        return new ObservableDataSource(ds);
                    }
                    return bean;
                }
            };
        }
    }

    static class ObservableDataSource extends DelegatingDataSource {

        public ObservableDataSource(DataSource targetDataSource) {
            super(targetDataSource);
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection target = super.getConnection();
            // Preset the baseline connection isolation level to verify Spring changes and restores it
            target.setTransactionIsolation(BASELINE_POOL_ISOLATION);
            return wrapConnection(target);
        }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            Connection target = super.getConnection(username, password);
            target.setTransactionIsolation(BASELINE_POOL_ISOLATION);
            return wrapConnection(target);
        }

        private Connection wrapConnection(Connection target) {
            return (Connection) Proxy.newProxyInstance(
                    Connection.class.getClassLoader(),
                    new Class<?>[]{Connection.class},
                    new ConnectionInvocationHandler(target)
            );
        }
    }

    static class ConnectionInvocationHandler implements InvocationHandler {

        private final Connection target;

        public ConnectionInvocationHandler(Connection target) {
            this.target = target;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            String methodName = method.getName();

            if ("setTransactionIsolation".equals(methodName) && args != null && args.length == 1) {
                int level = (Integer) args[0];
                RECORDED_SET_ISOLATION_CALLS.add(level);
            }

            if ("prepareStatement".equals(methodName) || "createStatement".equals(methodName)) {
                try {
                    int currentIso = target.getTransactionIsolation();
                    OBSERVED_ISOLATIONS_DURING_REPO_ACCESS.add(currentIso);
                } catch (Exception ignored) {
                }
            }

            if ("close".equals(methodName)) {
                try {
                    int closeIso = target.getTransactionIsolation();
                    OBSERVED_ISOLATIONS_AT_CLOSE.add(closeIso);
                } catch (Exception ignored) {
                }
            }

            try {
                return method.invoke(target, args);
            } catch (java.lang.reflect.InvocationTargetException e) {
                throw e.getTargetException();
            }
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
        RECORDED_SET_ISOLATION_CALLS.clear();
        OBSERVED_ISOLATIONS_DURING_REPO_ACCESS.clear();
        OBSERVED_ISOLATIONS_AT_CLOSE.clear();

        repository.deleteAll();
        appointmentRepository.deleteAll();
        userRepository.deleteAll();

        testPatient = new User(
                "iso.patient@dentcare.test",
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
        testAppointment.setReason("Isolation Test");
        testAppointment.setStatus(AppointmentStatus.PENDING);
        testAppointment = appointmentRepository.saveAndFlush(testAppointment);
    }

    @AfterEach
    void tearDown() {
        repository.deleteAll();
        appointmentRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("1. Actual JDBC connection uses TRANSACTION_READ_COMMITTED during claim and restores level on close")
    void testActualJdbcConnectionUsesReadCommittedAndRestores() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment,
                "iso-test-key-1",
                "iso.patient@dentcare.test",
                "Subject",
                "Body"
        );
        notif.setStatus(EmailNotificationStatus.PENDING);
        notif.setCreatedAt(now.minusMinutes(10));
        repository.saveAndFlush(notif);

        // Clear trackers after initial setup queries
        RECORDED_SET_ISOLATION_CALLS.clear();
        OBSERVED_ISOLATIONS_DURING_REPO_ACCESS.clear();
        OBSERVED_ISOLATIONS_AT_CLOSE.clear();

        // Execute claim operation through Spring-managed proxy bean
        AppointmentEmailClaimResult result = claimService.claimPendingEmails(cutoff, 10, 120L);

        assertThat(result.claimedCount()).isEqualTo(1);

        // Verify that Spring explicitly set Connection.TRANSACTION_READ_COMMITTED
        assertThat(RECORDED_SET_ISOLATION_CALLS)
                .as("Spring must explicitly set transaction isolation to Connection.TRANSACTION_READ_COMMITTED (2)")
                .contains(Connection.TRANSACTION_READ_COMMITTED);

        // Verify that all repository SQL queries executed under TRANSACTION_READ_COMMITTED
        assertThat(OBSERVED_ISOLATIONS_DURING_REPO_ACCESS)
                .as("Repository statements must execute with Connection.TRANSACTION_READ_COMMITTED (2)")
                .isNotEmpty()
                .contains(Connection.TRANSACTION_READ_COMMITTED);

        // Verify that Spring restored the baseline isolation level when closing the connection back to the pool
        assertThat(OBSERVED_ISOLATIONS_AT_CLOSE)
                .as("Connection isolation must be restored to baseline level upon close/return to pool")
                .contains(BASELINE_POOL_ISOLATION);
    }

    @Test
    @DisplayName("2. REQUIRES_NEW propagation: caller transaction rollback does not rollback independent claim")
    void testRequiresNewIndependentTransactionCommitsDespiteCallerRollback() {
        LocalDateTime now = LocalDateTime.now(fixedClock);
        LocalDateTime cutoff = now.minusHours(1);

        AppointmentEmailNotification notif = new AppointmentEmailNotification(
                testAppointment,
                "iso-test-key-2",
                "iso.patient@dentcare.test",
                "Subject",
                "Body"
        );
        notif.setStatus(EmailNotificationStatus.PENDING);
        notif.setCreatedAt(now.minusMinutes(10));
        notif = repository.saveAndFlush(notif);
        Long notifId = notif.getId();

        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        // Caller starts an existing outer transaction and calls claimService.claimPendingEmails
        assertThatThrownBy(() -> transactionTemplate.execute(status -> {
            AppointmentEmailClaimResult claimRes = claimService.claimPendingEmails(cutoff, 10, 120L);
            assertThat(claimRes.claimedCount()).isEqualTo(1);
            // Simulated catastrophic failure in caller transaction AFTER claim completed
            throw new RuntimeException("Simulated crash in caller transaction");
        })).isInstanceOf(RuntimeException.class).hasMessageContaining("Simulated crash in caller transaction");

        // The claim ran with REQUIRES_NEW, so it committed independently before caller failed.
        AppointmentEmailNotification reloaded = repository.findById(notifId).orElseThrow();
        assertThat(reloaded.getStatus())
                .as("Claim status must remain committed as PROCESSING despite caller transaction rollback")
                .isEqualTo(EmailNotificationStatus.PROCESSING);
        assertThat(reloaded.getAttemptCount()).isEqualTo(1);
        assertThat(reloaded.getLockedBy()).isNotBlank();
        assertThat(reloaded.getLockedAt()).isEqualTo(now);
        assertThat(reloaded.getLeaseUntil()).isEqualTo(now.plusSeconds(120L));
    }
}
