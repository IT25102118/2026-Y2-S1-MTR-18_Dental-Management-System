package com.dentcare.notification.service;

/**
 * Outcome classification for a claimed email notification attempt.
 *
 * Provides a deliberately classified outcome contract decoupling the transport
 * result from outbox state finalization.
 */
public enum EmailDeliveryOutcome {

    /**
     * The configured provider explicitly accepted the email for relay.
     */
    ACCEPTED_BY_SMTP,

    /**
     * The sender has positive evidence the provider did NOT accept the message,
     * and retry may be safe after a delay.
     */
    DEFINITELY_NOT_ACCEPTED_TRANSIENT,

    /**
     * The provider definitely rejected the email, or a local non-retriable validation
     * failure occurred before transmission.
     */
    DEFINITELY_NOT_ACCEPTED_PERMANENT,

    /**
     * The sender cannot establish whether the provider accepted the message.
     */
    DELIVERY_OUTCOME_UNKNOWN
}
