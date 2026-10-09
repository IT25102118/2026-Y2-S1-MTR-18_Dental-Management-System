package com.dentcare.security.entity;

/**
 * Immutable provenance indicator defining the environment mode under which
 * an OTP verification challenge was generated and dispatched.
 *
 * Distinguishes between simulated test fixtures and genuine live telecommunication delivery.
 * Critical: TEST mode challenges must never establish trusted production phone verification.
 */
public enum PhoneVerificationDeliveryMode {
    /**
     * Challenge dispatched through an in-memory test sink or simulated provider.
     * Accessible strictly to automated integration test fixtures.
     */
    TEST,

    /**
     * Challenge dispatched through a configured live telecommunications provider gateway.
     */
    LIVE
}
