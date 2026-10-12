package com.dentcare.notification.entity;

/**
 * Lifecycle states for SMS notifications in the transactional outbox.
 */
public enum NotificationStatus {

    /**
     * Notification is persisted and waiting for dispatcher processing.
     */
    PENDING,

    /**
     * Notification is claimed by a worker lease for transmission.
     */
    PROCESSING,

    /**
     * Notification was accepted by the external SMS provider gateway (not necessarily delivered to handset).
     */
    SUBMITTED,

    /**
     * Notification confirmed delivered to handset via definitive provider delivery evidence or webhook.
     */
    DELIVERED,

    /**
     * Terminal failure after non-retryable rejection or maximum retry attempts exhausted.
     */
    FAILED,

    /**
     * Network or provider timeout occurred after dispatch; outcome cannot be determined safely.
     */
    UNCERTAIN,

    /**
     * Simulated dispatch in non-live mode (SMS disabled or mock environment). No live network traffic occurred.
     */
    SIMULATED,

    /**
     * Explicitly cancelled before provider transmission.
     */
    CANCELLED
}
