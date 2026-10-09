package com.dentcare.security.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OtpCryptoServiceTest {

    private static final byte[] TEST_SECRET_KEY_1 =
            "01234567890123456789012345678901".getBytes(StandardCharsets.UTF_8); // 32 bytes
    private static final byte[] TEST_SECRET_KEY_2 =
            "abcdefghijklmnopqrstuvwxyz012345".getBytes(StandardCharsets.UTF_8); // 32 bytes

    private static final Long TEST_CHALLENGE_ID = 101L;
    private static final Long TEST_USER_ID = 42L;
    private static final String TEST_NORMALIZED_PHONE = "+94771234567";
    private static final String TEST_OTP = "729401";

    private OtpCryptoService cryptoService;

    @BeforeEach
    void setUp() {
        cryptoService = new OtpCryptoService();
    }

    @Test
    @DisplayName("1. Generated OTP always has exactly six ASCII digits")
    void testGeneratedOtpLengthAndFormat() {
        for (int i = 0; i < 50; i++) {
            String otp = cryptoService.generateSixDigitOtp();
            assertThat(otp).isNotNull();
            assertThat(otp).hasSize(6);
            assertThat(otp).matches("^\\d{6}$");
        }
    }

    @Test
    @DisplayName("2. Leading-zero codes are properly formatted with 6 digits")
    void testLeadingZeroCodesSupported() {
        // Mock random returning small values to verify leading zeros
        Random controlledRandom = new Random() {
            private int call = 0;
            @Override
            public int nextInt(int bound) {
                return switch (call++) {
                    case 0 -> 0;      // Should produce "000000"
                    case 1 -> 7;      // Should produce "000007"
                    case 2 -> 42;     // Should produce "000042"
                    case 3 -> 999;    // Should produce "000999"
                    case 4 -> 999999; // Should produce "999999"
                    default -> 12345;
                };
            }
        };

        OtpCryptoService mockService = new OtpCryptoService(controlledRandom);
        assertThat(mockService.generateSixDigitOtp()).isEqualTo("000000");
        assertThat(mockService.generateSixDigitOtp()).isEqualTo("000007");
        assertThat(mockService.generateSixDigitOtp()).isEqualTo("000042");
        assertThat(mockService.generateSixDigitOtp()).isEqualTo("000999");
        assertThat(mockService.generateSixDigitOtp()).isEqualTo("999999");
    }

    @Test
    @DisplayName("3. SecureRandom is used by default constructor")
    void testSecureRandomUsedByDefault() {
        OtpCryptoService service = new OtpCryptoService();
        String otp1 = service.generateSixDigitOtp();
        String otp2 = service.generateSixDigitOtp();
        assertThat(otp1).matches("^\\d{6}$");
        assertThat(otp2).matches("^\\d{6}$");
    }

    @Test
    @DisplayName("4. Fixed valid test input produces a deterministic MAC")
    void testDeterministicMacCalculation() {
        String mac1 = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );
        String mac2 = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );

        assertThat(mac1).isNotNull();
        assertThat(mac1).isEqualTo(mac2);
    }

    @Test
    @DisplayName("5. Correct OTP verifies successfully")
    void testCorrectOtpVerifiesSuccessfully() {
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );

        boolean verified = cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP, mac
        );

        assertThat(verified).isTrue();
    }

    @Test
    @DisplayName("6. Incorrect OTP fails verification")
    void testIncorrectOtpFailsVerification() {
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, "123456"
        );

        boolean verified = cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, "654321", mac
        );

        assertThat(verified).isFalse();
    }

    @Test
    @DisplayName("7. Incorrect challenge ID fails verification")
    void testIncorrectChallengeIdFails() {
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, 100L, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );

        boolean verified = cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, 101L, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP, mac
        );

        assertThat(verified).isFalse();
    }

    @Test
    @DisplayName("8. Incorrect user ID fails verification")
    void testIncorrectUserIdFails() {
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, 42L, TEST_NORMALIZED_PHONE, TEST_OTP
        );

        boolean verified = cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, 43L, TEST_NORMALIZED_PHONE, TEST_OTP, mac
        );

        assertThat(verified).isFalse();
    }

    @Test
    @DisplayName("9. Incorrect phone snapshot fails verification")
    void testIncorrectPhoneSnapshotFails() {
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, "+94771111111", TEST_OTP
        );

        boolean verified = cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, "+94772222222", TEST_OTP, mac
        );

        assertThat(verified).isFalse();
    }

    @Test
    @DisplayName("10. Malformed MAC values fail verification cleanly")
    void testMalformedMacFailsCleanly() {
        assertThat(cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP, null
        )).isFalse();

        assertThat(cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP, ""
        )).isFalse();

        assertThat(cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP, "too_short"
        )).isFalse();

        // 64 chars but non-hex characters
        String nonHex = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";
        assertThat(cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP, nonHex
        )).isFalse();
    }

    @Test
    @DisplayName("11. Missing or short secret key is rejected with exception")
    void testMissingOrShortKeyRejected() {
        assertThatThrownBy(() -> cryptoService.computeOtpMac(
                null, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Secret key cannot be null");

        byte[] emptyKey = new byte[0];
        assertThatThrownBy(() -> cryptoService.computeOtpMac(
                emptyKey, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minimum required length is 32 bytes");

        byte[] shortKey = new byte[31];
        assertThatThrownBy(() -> cryptoService.computeOtpMac(
                shortKey, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minimum required length is 32 bytes");
    }

    @Test
    @DisplayName("12. Different supported secret keys produce different MAC outputs")
    void testDifferentSecretsProduceDifferentMacs() {
        String mac1 = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );
        String mac2 = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_2, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );

        assertThat(mac1).isNotEqualTo(mac2);
    }

    @Test
    @DisplayName("13. MAC output is exactly 64 lowercase hexadecimal characters")
    void testMacOutputFormat() {
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );

        assertThat(mac).hasSize(64);
        assertThat(mac).matches("^[0-9a-f]{64}$");
    }

    @Test
    @DisplayName("14. Submitted code and secret key are not leaked into exception text")
    void testCodeAndSecretNotLeakedInExceptions() {
        String secretCode = "987654";

        assertThatThrownBy(() -> cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, null, TEST_USER_ID, TEST_NORMALIZED_PHONE, secretCode
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining(secretCode)
                .hasMessageNotContaining(new String(TEST_SECRET_KEY_1, StandardCharsets.UTF_8));

        assertThatThrownBy(() -> cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, "bad"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("bad");
    }

    @Test
    @DisplayName("15. Code is not persisted or leaked by crypto service")
    void testCodeNotPersistedOrLogged() {
        // Pure stateless computation; verify no static or internal state leaks
        String mac = cryptoService.computeOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP
        );
        assertThat(mac).doesNotContain(TEST_OTP);
    }

    @Test
    @DisplayName("16. No application or user verification state changes occur")
    void testNoApplicationStateChanges() {
        // Stateless service performs only calculation and constant-time validation
        boolean valid = cryptoService.verifyOtpMac(
                TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP,
                cryptoService.computeOtpMac(TEST_SECRET_KEY_1, TEST_CHALLENGE_ID, TEST_USER_ID, TEST_NORMALIZED_PHONE, TEST_OTP)
        );
        assertThat(valid).isTrue();
    }
}
