package com.dentcare.security.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Random;
import java.util.regex.Pattern;

/**
 * Cryptographic service providing secure, non-network OTP primitives:
 * 1. Cryptographically secure 6-digit OTP generation using SecureRandom.
 * 2. Challenge-bound HMAC-SHA256 MAC calculation.
 * 3. Constant-time MAC verification via MessageDigest.isEqual.
 *
 * Security Invariants:
 * - Plaintext OTP codes and secret keys are never logged or stored.
 * - Exception messages never contain submitted OTP codes or secret key material.
 * - MAC verification executes in constant time to prevent timing side-channel attacks.
 */
@Service
public class OtpCryptoService {

    public static final String HMAC_ALGORITHM = "HmacSHA256";
    public static final int MINIMUM_KEY_LENGTH_BYTES = 32; // 256 bits minimum
    public static final int OTP_DIGIT_LENGTH = 6;
    public static final int EXPECTED_HEX_MAC_LENGTH = 64;

    private static final String DOMAIN_TAG = "DENTCARE_OTP";
    private static final String PROTOCOL_VERSION = "V1";
    private static final Pattern SIX_DIGIT_PATTERN = Pattern.compile("^\\d{6}$");
    private static final Pattern HEX_PATTERN = Pattern.compile("^[0-9a-fA-F]{64}$");

    private final Random random;

    /**
     * Default constructor utilizing a thread-safe SecureRandom instance.
     */
    public OtpCryptoService() {
        this(new SecureRandom());
    }

    /**
     * Package-private or test constructor enabling deterministic RNG injection for testing.
     *
     * @param random random instance (must not be null)
     */
    public OtpCryptoService(Random random) {
        if (random == null) {
            throw new IllegalArgumentException("Random instance cannot be null");
        }
        this.random = random;
    }

    /**
     * Generates a cryptographically secure 6-digit numeric OTP code in the range 000000 to 999999.
     * Leading zeros are fully preserved.
     *
     * @return exactly six ASCII numeric digits
     */
    public String generateSixDigitOtp() {
        int code = random.nextInt(1_000_000);
        return String.format("%06d", code);
    }

    /**
     * Computes a challenge-bound HMAC-SHA256 digest in lowercase 64-character hexadecimal representation.
     *
     * Binds together:
     * - Protocol domain ("DENTCARE_OTP")
     * - Version ("V1")
     * - Challenge ID
     * - Authenticated User ID
     * - Normalized E.164 phone snapshot
     * - Six-digit OTP
     *
     * @param secretKey       server-held secret key (minimum 32 bytes)
     * @param challengeId     challenge identifier (must be positive)
     * @param userId          authenticated user identifier (must be positive)
     * @param normalizedPhone normalized E.164 phone string (e.g. +94771234567)
     * @param otp             six-digit numeric OTP
     * @return 64 lowercase hexadecimal characters representing the HMAC-SHA256 digest
     */
    public String computeOtpMac(
            byte[] secretKey,
            Long challengeId,
            Long userId,
            String normalizedPhone,
            String otp
    ) {
        validateSecretKey(secretKey);
        validateChallengeBindings(challengeId, userId, normalizedPhone, otp);

        byte[] canonicalBytes = buildCanonicalRepresentation(challengeId, userId, normalizedPhone, otp);
        byte[] macBytes = executeHmacSha256(secretKey, canonicalBytes);
        return HexFormat.of().formatHex(macBytes);
    }

    /**
     * Verifies whether a candidate OTP matches the stored HMAC-SHA256 digest in constant time.
     *
     * @param secretKey       server-held secret key (minimum 32 bytes)
     * @param challengeId     challenge identifier
     * @param userId          authenticated user identifier
     * @param normalizedPhone normalized E.164 phone string
     * @param candidateOtp    candidate six-digit OTP submitted by patient
     * @param storedMacHex    persisted 64-character hexadecimal MAC
     * @return true if candidate OTP matches and bindings are authentic, false otherwise
     */
    public boolean verifyOtpMac(
            byte[] secretKey,
            Long challengeId,
            Long userId,
            String normalizedPhone,
            String candidateOtp,
            String storedMacHex
    ) {
        validateSecretKey(secretKey);

        if (challengeId == null || challengeId <= 0 ||
                userId == null || userId <= 0 ||
                normalizedPhone == null || normalizedPhone.isBlank() ||
                candidateOtp == null || !SIX_DIGIT_PATTERN.matcher(candidateOtp).matches() ||
                storedMacHex == null || storedMacHex.length() != EXPECTED_HEX_MAC_LENGTH ||
                !HEX_PATTERN.matcher(storedMacHex).matches()) {
            return false;
        }

        byte[] expectedMacBytes;
        try {
            byte[] canonicalBytes = buildCanonicalRepresentation(challengeId, userId, normalizedPhone, candidateOtp);
            expectedMacBytes = executeHmacSha256(secretKey, canonicalBytes);
        } catch (Exception e) {
            return false;
        }

        byte[] storedMacBytes;
        try {
            storedMacBytes = HexFormat.of().parseHex(storedMacHex);
        } catch (IllegalArgumentException e) {
            return false;
        }

        // Constant-time byte array comparison against timing side-channel attacks
        return MessageDigest.isEqual(expectedMacBytes, storedMacBytes);
    }

    /**
     * Builds the documented, unambiguous canonical byte representation.
     * Uses type tags and unambiguous field delimiters with explicit UTF-8 encoding.
     */
    private byte[] buildCanonicalRepresentation(
            Long challengeId,
            Long userId,
            String normalizedPhone,
            String otp
    ) {
        String canonicalString = DOMAIN_TAG + "|" +
                PROTOCOL_VERSION + "|C:" +
                challengeId + "|U:" +
                userId + "|P:" +
                normalizedPhone + "|O:" +
                otp;
        return canonicalString.getBytes(StandardCharsets.UTF_8);
    }

    private byte[] executeHmacSha256(byte[] secretKey, byte[] data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(secretKey, HMAC_ALGORITHM);
            mac.init(keySpec);
            return mac.doFinal(data);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to calculate HMAC-SHA256 digest", e);
        }
    }

    private void validateSecretKey(byte[] secretKey) {
        if (secretKey == null) {
            throw new IllegalArgumentException("Secret key cannot be null");
        }
        if (secretKey.length < MINIMUM_KEY_LENGTH_BYTES) {
            throw new IllegalArgumentException(
                    "Secret key length is insufficient; minimum required length is " +
                            MINIMUM_KEY_LENGTH_BYTES + " bytes (" + (MINIMUM_KEY_LENGTH_BYTES * 8) + " bits)"
            );
        }
    }

    private void validateChallengeBindings(
            Long challengeId,
            Long userId,
            String normalizedPhone,
            String otp
    ) {
        if (challengeId == null || challengeId <= 0) {
            throw new IllegalArgumentException("Challenge ID must be a positive non-null number");
        }
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("User ID must be a positive non-null number");
        }
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            throw new IllegalArgumentException("Phone snapshot cannot be null or blank");
        }
        if (otp == null || !SIX_DIGIT_PATTERN.matcher(otp).matches()) {
            // Note: Exception message explicitly omits candidate value to prevent secret logging
            throw new IllegalArgumentException("OTP code must be exactly six ASCII numeric digits");
        }
    }
}
