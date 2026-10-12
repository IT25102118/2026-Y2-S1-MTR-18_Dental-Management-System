package com.dentcare.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Production SMTP implementation of {@link AppointmentEmailTransport} using Spring's {@link JavaMailSender}.
 * <p>
 * This transport is disabled by default via {@code dentcare.email.smtp.enabled=false}.
 * When enabled, it strictly validates sender and recipient headers to prevent header injection (CRLF),
 * constructs plain-text messages, logs only masked identifiers without exposing secrets or bodies,
 * and lets transport failures propagate directly for caller-controlled retry handling.
 * <p>
 * IMPORTANT: Acceptance by {@link JavaMailSender} confirms only that the configured mail transport
 * accepted the message for relay, not proof of inbox placement or recipient receipt.
 */
@Service
@ConditionalOnProperty(name = "dentcare.email.smtp.enabled", havingValue = "true")
public class SmtpAppointmentEmailTransport implements AppointmentEmailTransport {

    private static final Logger log = LoggerFactory.getLogger(SmtpAppointmentEmailTransport.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$"
    );

    private final JavaMailSender mailSender;
    private final String fromAddress;

    @Autowired
    public SmtpAppointmentEmailTransport(
            JavaMailSender mailSender,
            @Value("${dentcare.email.from:}") String fromAddress,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${spring.mail.username:}") String mailUsername,
            @Value("${spring.mail.password:}") String mailPassword
    ) {
        if (mailSender == null) {
            throw new IllegalStateException("JavaMailSender must not be null when dentcare.email.smtp.enabled=true");
        }
        if (mailHost == null || mailHost.isBlank()) {
            throw new IllegalStateException("SMTP host ('spring.mail.host') is required when dentcare.email.smtp.enabled=true");
        }
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException("Sender email address ('dentcare.email.from') is required when dentcare.email.smtp.enabled=true");
        }
        if (fromAddress.contains("\r") || fromAddress.contains("\n")) {
            throw new IllegalStateException("Configured sender address ('dentcare.email.from') contains carriage return or newline characters");
        }
        if (!isValidEmail(fromAddress.trim())) {
            throw new IllegalStateException("Configured sender address ('dentcare.email.from') is invalid: " + maskEmail(fromAddress));
        }
        if (mailUsername != null && !mailUsername.isBlank() && (mailPassword == null || mailPassword.isBlank())) {
            throw new IllegalStateException("SMTP password ('spring.mail.password') is required when SMTP username is configured");
        }

        this.mailSender = mailSender;
        this.fromAddress = fromAddress.trim();
    }

    /**
     * Testing constructor with mock mail sender and explicit sender address.
     */
    public SmtpAppointmentEmailTransport(JavaMailSender mailSender, String fromAddress) {
        this(mailSender, fromAddress, "smtp.test.local", null, null);
    }

    @Override
    public void send(String recipientEmail, String subject, String body) {
        validateRecipient(recipientEmail);
        validateSubject(subject);
        validateBody(body);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(this.fromAddress);
        message.setTo(recipientEmail.trim());
        message.setSubject(subject.trim());
        message.setText(body);

        log.info("Dispatching plain-text appointment email via SMTP to [{}] with subject [{}]",
                maskEmail(recipientEmail.trim()), subject.trim());

        try {
            mailSender.send(message);
            log.info("SMTP transport accepted message for recipient [{}]",
                    maskEmail(recipientEmail.trim()));
        } catch (MailException ex) {
            log.error("SMTP transmission failed for recipient [{}]",
                    maskEmail(recipientEmail.trim()), ex);
            throw ex;
        }
    }

    public String getFromAddress() {
        return fromAddress;
    }

    private void validateRecipient(String recipientEmail) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new IllegalArgumentException("Recipient email address must not be blank");
        }
        if (recipientEmail.contains("\r") || recipientEmail.contains("\n")) {
            throw new IllegalArgumentException("Recipient email address must not contain carriage return or newline characters");
        }
        if (!isValidEmail(recipientEmail.trim())) {
            throw new IllegalArgumentException("Invalid recipient email address format: " + maskEmail(recipientEmail));
        }
    }

    private void validateSubject(String subject) {
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("Email subject must not be blank");
        }
        if (subject.contains("\r") || subject.contains("\n")) {
            throw new IllegalArgumentException("Email subject must not contain carriage return or newline characters");
        }
    }

    private void validateBody(String body) {
        if (body == null) {
            throw new IllegalArgumentException("Email body must not be null");
        }
    }

    public static boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "***";
        }
        int atIndex = email.indexOf('@');
        if (atIndex < 0) {
            return "***";
        }
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex + 1);
        if (local.isEmpty()) {
            return "***@" + domain;
        }
        if (local.length() <= 2) {
            return local.charAt(0) + "***@" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + "@" + domain;
    }
}
