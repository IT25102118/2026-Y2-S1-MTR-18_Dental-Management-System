package com.dentcare.security.entity;

/**
 * Enumeration of lifecycle and delivery states for a phone verification challenge.
 *
 * Distinctly captures challenge creation, delivery dispatch states, and eventual
 * resolution without conflating transport dispatch with verified consumption.
 */
public enum PhoneVerificationChallengeStatus {
    /**
     * Challenge record created and stored in the database.
     * External SMS provider has not yet accepted a delivery dispatch request.
     */
    CREATED,

    /**
     * External SMS provider accepted the OTP delivery request.
     * Note: This confirms provider acceptance, NOT handset delivery.
     */
    SUBMITTED,

    /**
     * External delivery request outcome is ambiguous (e.g. timeout or uncertain HTTP response).
     */
    DELIVERY_UNCERTAIN,

    /**
     * Known external delivery send failure (e.g. gateway error or invalid destination).
     */
    SEND_FAILED,

    /**
     * Challenge code was successfully verified and consumed by an authorized verification service.
     */
    VERIFIED,

    /**
     * Challenge validity duration elapsed without successful verification.
     */
    EXPIRED,

    /**
     * Maximum verification attempts limit was reached; challenge is locked and cannot be verified.
     */
    EXHAUSTED,

    /**
     * Invalidated because a newer challenge was issued or the user's phone was updated.
     */
    SUPERSEDED
}
