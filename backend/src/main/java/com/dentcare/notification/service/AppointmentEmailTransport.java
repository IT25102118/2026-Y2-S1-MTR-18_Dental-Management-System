package com.dentcare.notification.service;

/**
 * Minimal transport abstraction for external appointment email delivery.
 * <p>
 * Decoupled from appointment persistence, transactional boundaries,
 * outbox state management, and retry classification.
 */
public interface AppointmentEmailTransport {

    /**
     * Attempts to send a plain-text email message via the underlying transport.
     * <p>
     * Note: Successful execution indicates that the configured transport accepted
     * the message for delivery, not proof that the recipient received or read it.
     *
     * @param recipientEmail destination email address (must be a valid, trusted address)
     * @param subject        email subject line (plain text, single-line)
     * @param body           email body text (plain text)
     * @throws IllegalArgumentException if recipient or subject is invalid or contains CR/LF
     * @throws org.springframework.mail.MailException if transport delivery fails
     */
    void send(String recipientEmail, String subject, String body);
}
