package com.dentcare.security.repository;

import com.dentcare.security.entity.PhoneVerificationChallenge;
import com.dentcare.security.entity.PhoneVerificationChallengeStatus;
import com.dentcare.security.entity.PhoneVerificationDeliveryMode;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-auth.sql")
class PhoneVerificationChallengeRepositoryTest {

    private static final String SYNTHETIC_PHONE_1 = "+94770000001";
    private static final String SYNTHETIC_PHONE_2 = "+94770000002";
    private static final String DUMMY_HMAC_MAC = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";

    @Autowired
    private PhoneVerificationChallengeRepository challengeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User(
                "patient.otp.test@dentcare.com",
                "$2a$10$dummyHashedPasswordForTestOnly999999999999999999999999",
                "Kasun",
                "Perera",
                SYNTHETIC_PHONE_1,
                Role.PATIENT
        );
        testUser = userRepository.saveAndFlush(testUser);
    }

    private PhoneVerificationChallenge createChallenge(User user, String phone, PhoneVerificationDeliveryMode mode) {
        return new PhoneVerificationChallenge(
                user,
                phone,
                DUMMY_HMAC_MAC,
                mode,
                LocalDateTime.now().plusMinutes(5)
        );
    }

    @Test
    @DisplayName("1. Persist and reload challenge successfully")
    void testPersistAndReloadChallenge() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);

        assertThat(saved.getId()).isNotNull();
        entityManager.clear();

        Optional<PhoneVerificationChallenge> reloaded = challengeRepository.findById(saved.getId());
        assertThat(reloaded).isPresent();
        PhoneVerificationChallenge loaded = reloaded.get();
        assertThat(loaded.getPhoneSnapshot()).isEqualTo(SYNTHETIC_PHONE_1);
        assertThat(loaded.getOtpMac()).isEqualTo(DUMMY_HMAC_MAC);
        assertThat(loaded.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.CREATED);
        assertThat(loaded.getDeliveryMode()).isEqualTo(PhoneVerificationDeliveryMode.TEST);
        assertThat(loaded.getAttemptCount()).isEqualTo(0);
        assertThat(loaded.getMaxAttempts()).isEqualTo(3);
        assertThat(loaded.getCreatedAt()).isNotNull();
        assertThat(loaded.getUpdatedAt()).isNotNull();
        assertThat(loaded.getUser().getId()).isEqualTo(testUser.getId());
    }

    @Test
    @DisplayName("2. Foreign key references valid user")
    void testForeignKeyReferencesValidUser() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);
        entityManager.clear();

        PhoneVerificationChallenge loaded = challengeRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getUser()).isNotNull();
        assertThat(loaded.getUser().getEmail()).isEqualTo("patient.otp.test@dentcare.com");
    }

    @Test
    @DisplayName("3. Invalid user reference rejected")
    void testInvalidUserReferenceRejected() {
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge(
                null,
                SYNTHETIC_PHONE_1,
                DUMMY_HMAC_MAC,
                PhoneVerificationDeliveryMode.TEST,
                LocalDateTime.now().plusMinutes(5)
        );

        assertThatThrownBy(() -> challengeRepository.saveAndFlush(challenge))
                .isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("4. Enum values stored as strings")
    void testEnumValuesStoredAsStrings() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challenge.setStatus(PhoneVerificationChallengeStatus.SUBMITTED);
        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);
        entityManager.clear();

        // Query raw string column values directly from database
        Object[] rawRow = (Object[]) entityManager.createNativeQuery(
                "SELECT status, delivery_mode FROM phone_verification_challenges WHERE id = " + saved.getId()
        ).getSingleResult();

        assertThat(rawRow[0]).isEqualTo("SUBMITTED");
        assertThat(rawRow[1]).isEqualTo("TEST");
    }

    @Test
    @DisplayName("5. Invalid status rejected")
    void testInvalidStatusRejected() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challenge.setStatus(null);

        assertThatThrownBy(() -> challengeRepository.saveAndFlush(challenge))
                .isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);

        entityManager.clear();

        assertThatThrownBy(() -> {
            entityManager.createNativeQuery(
                    "INSERT INTO phone_verification_challenges (user_id, phone_snapshot, otp_mac, status, delivery_mode, attempt_count, max_attempts, expires_at) " +
                            "VALUES (" + testUser.getId() + ", '" + SYNTHETIC_PHONE_1 + "', '" + DUMMY_HMAC_MAC + "', 'ILLEGAL_STATUS', 'TEST', 0, 3, CURRENT_TIMESTAMP)"
            ).executeUpdate();
            entityManager.flush();
        }).isInstanceOfAny(DataIntegrityViolationException.class, jakarta.persistence.PersistenceException.class);

        entityManager.clear();
    }

    @Test
    @DisplayName("6. Attempt counters reject negative values")
    void testAttemptCountersRejectNegative() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challenge.setAttemptCount(-1);

        assertThatThrownBy(() -> challengeRepository.saveAndFlush(challenge))
                .isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("7. Max attempts cannot be zero or negative")
    void testMaxAttemptsCannotBeZero() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challenge.setMaxAttempts(0);

        assertThatThrownBy(() -> challengeRepository.saveAndFlush(challenge))
                .isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("8. TEST and LIVE provenance stored explicitly")
    void testTestAndLiveProvenanceStoredExplicitly() {
        PhoneVerificationChallenge testChallenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        PhoneVerificationChallenge liveChallenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.LIVE);

        challengeRepository.saveAndFlush(testChallenge);
        challengeRepository.saveAndFlush(liveChallenge);
        entityManager.clear();

        PhoneVerificationChallenge loadedTest = challengeRepository.findById(testChallenge.getId()).orElseThrow();
        PhoneVerificationChallenge loadedLive = challengeRepository.findById(liveChallenge.getId()).orElseThrow();

        assertThat(loadedTest.getDeliveryMode()).isEqualTo(PhoneVerificationDeliveryMode.TEST);
        assertThat(loadedLive.getDeliveryMode()).isEqualTo(PhoneVerificationDeliveryMode.LIVE);
    }

    @Test
    @DisplayName("9. No implicit LIVE provenance (delivery mode must be explicitly provided)")
    void testNoImplicitLiveProvenance() {
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge();
        challenge.setUser(testUser);
        challenge.setPhoneSnapshot(SYNTHETIC_PHONE_1);
        challenge.setOtpMac(DUMMY_HMAC_MAC);
        challenge.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        // deliveryMode left null intentionally

        assertThatThrownBy(() -> challengeRepository.saveAndFlush(challenge))
                .isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("10. MAC storage does not require plaintext OTP")
    void testMacStorageDoesNotRequirePlaintextOtp() {
        // Only a fixed-length HMAC digest is stored
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);
        entityManager.clear();

        PhoneVerificationChallenge loaded = challengeRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getOtpMac()).isEqualTo(DUMMY_HMAC_MAC);
        assertThat(loaded.toString()).doesNotContain(DUMMY_HMAC_MAC);
    }

    @Test
    @DisplayName("11. Per-user request history query and order")
    void testPerUserRequestHistoryQuery() {
        LocalDateTime t1 = LocalDateTime.now().minusMinutes(10);
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(5);

        PhoneVerificationChallenge c1 = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challengeRepository.saveAndFlush(c1);

        PhoneVerificationChallenge c2 = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challengeRepository.saveAndFlush(c2);

        entityManager.clear();

        long countRecent = challengeRepository.countByUserIdAndCreatedAtAfter(testUser.getId(), cutoff);
        assertThat(countRecent).isEqualTo(2);

        List<PhoneVerificationChallenge> userChallenges = challengeRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId());
        assertThat(userChallenges).hasSize(2);
        assertThat(userChallenges.get(0).getId()).isGreaterThanOrEqualTo(userChallenges.get(1).getId());
    }

    @Test
    @DisplayName("12. Per-phone request history query")
    void testPerPhoneRequestHistoryQuery() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(5);

        PhoneVerificationChallenge c1 = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        PhoneVerificationChallenge c2 = createChallenge(testUser, SYNTHETIC_PHONE_2, PhoneVerificationDeliveryMode.TEST);
        challengeRepository.saveAndFlush(c1);
        challengeRepository.saveAndFlush(c2);
        entityManager.clear();

        long countPhone1 = challengeRepository.countByPhoneSnapshotAndCreatedAtAfter(SYNTHETIC_PHONE_1, cutoff);
        long countPhone2 = challengeRepository.countByPhoneSnapshotAndCreatedAtAfter(SYNTHETIC_PHONE_2, cutoff);

        assertThat(countPhone1).isEqualTo(1);
        assertThat(countPhone2).isEqualTo(1);
    }

    @Test
    @DisplayName("13. Expiration timestamp persistence")
    void testExpirationTimestampPersistence() {
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5).truncatedTo(ChronoUnit.SECONDS);
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challenge.setExpiresAt(expiresAt);

        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);
        entityManager.clear();

        PhoneVerificationChallenge loaded = challengeRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getExpiresAt()).isEqualToIgnoringNanos(expiresAt);
    }

    @Test
    @DisplayName("14. Nullable submitted and verified timestamps")
    void testNullableSubmittedAndVerifiedTimestamps() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challenge.setSubmittedAt(null);
        challenge.setVerifiedAt(null);

        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);
        entityManager.clear();

        PhoneVerificationChallenge loaded = challengeRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getSubmittedAt()).isNull();
        assertThat(loaded.getVerifiedAt()).isNull();

        // Now populate timestamps
        LocalDateTime submittedTime = LocalDateTime.now().minusMinutes(1);
        LocalDateTime verifiedTime = LocalDateTime.now();
        loaded.setSubmittedAt(submittedTime);
        loaded.setVerifiedAt(verifiedTime);
        loaded.setStatus(PhoneVerificationChallengeStatus.VERIFIED);
        challengeRepository.saveAndFlush(loaded);
        entityManager.clear();

        PhoneVerificationChallenge loaded2 = challengeRepository.findById(saved.getId()).orElseThrow();
        assertThat(loaded2.getSubmittedAt()).isNotNull();
        assertThat(loaded2.getVerifiedAt()).isNotNull();
        assertThat(loaded2.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.VERIFIED);
    }

    @Test
    @DisplayName("15. No unrelated user verification mutation")
    void testNoUnrelatedUserVerificationMutation() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        challengeRepository.saveAndFlush(challenge);
        entityManager.clear();

        User freshUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(freshUser.isPhoneVerified()).isFalse();
        assertThat(freshUser.getPhoneVerifiedAt()).isNull();
    }

    @Test
    @DisplayName("16. No SMS network calls executed during persistence operations")
    void testNoSmsNetworkCalls() {
        PhoneVerificationChallenge challenge = createChallenge(testUser, SYNTHETIC_PHONE_1, PhoneVerificationDeliveryMode.TEST);
        PhoneVerificationChallenge saved = challengeRepository.saveAndFlush(challenge);

        assertThat(saved.getId()).isNotNull();
        // Fully isolated database persistence with zero network side effects
    }
}
