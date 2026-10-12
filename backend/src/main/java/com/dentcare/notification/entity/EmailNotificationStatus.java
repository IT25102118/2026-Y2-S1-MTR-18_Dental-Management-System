package com.dentcare.notification.entity;

/**
 * Lifecycle states for email notifications in the transactional outbox.
 */
public enum EmailNotificationStatus {

    /**
     * Notification is persisted and waiting for delivery.
     */
    PENDING,

    /**
     * Notification is actively claimed or being processed by an email dispatcher.
     */
    PROCESSING,

    /**
     * Configured email transport accepted the message for delivery.
     * Note: SENT indicates transport/gateway acceptance, not that the recipient opened or read it.
     */
    SENT,

    /**
     * Terminal failure after non-retryable rejection or maximum retry attempts exhausted.
     */
    FAILED,

    /**
     * Delivery outcome could not be definitively confirmed (e.g. transport timeout).
     */
    DELIVERY_UNCERTAIN
}
