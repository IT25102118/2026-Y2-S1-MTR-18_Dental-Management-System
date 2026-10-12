package com.dentcare.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SmtpAppointmentEmailTransportTest {

    private static final String SENDER_EMAIL = "notifications@dentcare.test";

    @Mock
    private JavaMailSender mailSender;

    private SmtpAppointmentEmailTransport transport;

    @BeforeEach
    void setUp() {
        transport = new SmtpAppointmentEmailTransport(mailSender, SENDER_EMAIL);
    }

    @Test
    @DisplayName("4, 5, 6, 7, 8. Valid envelope maps correctly to one plain-text SimpleMailMessage with configured sender, recipient, subject, and body")
    void testValidEnvelopeMapsToPlainTextEmail() {
        String recipient = "patient.smith@example.com";
        String subject = "DentCare - Appointment Request Received";
        String body = "Dear Patient,\n\nYour appointment request has been received.\n\nThank you,\nDentCare Team";

        transport.send(recipient, subject, body);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());

        SimpleMailMessage sentMessage = captor.getValue();
        assertThat(sentMessage).isNotNull();
        assertThat(sentMessage.getFrom()).isEqualTo(SENDER_EMAIL);
        assertThat(sentMessage.getTo()).containsExactly(recipient);
        assertThat(sentMessage.getSubject()).isEqualTo(subject);
        assertThat(sentMessage.getText()).isEqualTo(body);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "   ",
            "not-an-email",
            "missing-at-sign.com",
            "@missing-username.com",
            "user@missing-tld",
            "user@.com",
            "user name@domain.com"
    })
    @DisplayName("9. Invalid recipient format is rejected with IllegalArgumentException without calling mailSender")
    void testInvalidRecipientIsRejected(String invalidRecipient) {
        assertThatThrownBy(() -> transport.send(invalidRecipient, "Test Subject", "Test Body"))
                .isInstanceOf(IllegalArgumentException.class);

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("9b. Null recipient is rejected with IllegalArgumentException")
    void testNullRecipientIsRejected() {
        assertThatThrownBy(() -> transport.send(null, "Test Subject", "Test Body"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Recipient email address must not be blank");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "patient@example.com\r\nBcc: attacker@evil.com",
            "patient@example.com\nBcc: attacker@evil.com",
            "patient@example.com\rBcc: attacker@evil.com",
            "patient\r@example.com",
            "patient\n@example.com"
    })
    @DisplayName("10a. Header injection via CRLF in recipient email is rejected with IllegalArgumentException")
    void testHeaderInjectionInRecipientIsRejected(String maliciousRecipient) {
        assertThatThrownBy(() -> transport.send(maliciousRecipient, "Safe Subject", "Safe Body"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("carriage return or newline");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Subject\r\nBcc: attacker@evil.com",
            "Subject\nInjected-Header: value",
            "Subject\rInjected-Header: value",
            "\nSubject",
            "Subject\r\n"
    })
    @DisplayName("10b. Header injection via CRLF in subject line is rejected with IllegalArgumentException")
    void testHeaderInjectionInSubjectIsRejected(String maliciousSubject) {
        assertThatThrownBy(() -> transport.send("patient@example.com", maliciousSubject, "Safe Body"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("carriage return or newline");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("10c. Null or blank subject is rejected with IllegalArgumentException")
    void testBlankSubjectIsRejected() {
        assertThatThrownBy(() -> transport.send("patient@example.com", "   ", "Body"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email subject must not be blank");

        assertThatThrownBy(() -> transport.send("patient@example.com", null, "Body"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email subject must not be blank");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("10d. Null body is rejected with IllegalArgumentException")
    void testNullBodyIsRejected() {
        assertThatThrownBy(() -> transport.send("patient@example.com", "Subject", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email body must not be null");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("11. Transport failures (MailSendException) propagate directly without being swallowed")
    void testMailSendExceptionPropagates() {
        doThrow(new MailSendException("SMTP relay refused connection"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThatThrownBy(() -> transport.send("patient@example.com", "Subject", "Body"))
                .isInstanceOf(MailSendException.class)
                .hasMessageContaining("SMTP relay refused connection");
    }

    @Test
    @DisplayName("11b. Authentication failures (MailAuthenticationException) propagate directly")
    void testMailAuthenticationExceptionPropagates() {
        doThrow(new MailAuthenticationException("Authentication failed 535"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        assertThatThrownBy(() -> transport.send("patient@example.com", "Subject", "Body"))
                .isInstanceOf(MailAuthenticationException.class)
                .hasMessageContaining("Authentication failed 535");
    }

    @Test
    @DisplayName("12. Email masking helper prevents exposing complete recipient address")
    void testEmailMasking() {
        assertThat(SmtpAppointmentEmailTransport.maskEmail("patient@dentcare.test"))
                .isEqualTo("p***t@dentcare.test");
        assertThat(SmtpAppointmentEmailTransport.maskEmail("alice.bob@hospital.org"))
                .isEqualTo("a***b@hospital.org");
        assertThat(SmtpAppointmentEmailTransport.maskEmail("ab@example.com"))
                .isEqualTo("a***@example.com");
        assertThat(SmtpAppointmentEmailTransport.maskEmail("a@example.com"))
                .isEqualTo("a***@example.com");
        assertThat(SmtpAppointmentEmailTransport.maskEmail(null))
                .isEqualTo("***");
        assertThat(SmtpAppointmentEmailTransport.maskEmail(""))
                .isEqualTo("***");
        assertThat(SmtpAppointmentEmailTransport.maskEmail("invalid"))
                .isEqualTo("***");
    }

    @Test
    @DisplayName("3a. Constructor fails closed with IllegalStateException when mailSender is null")
    void testConstructorFailsOnNullMailSender() {
        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(null, SENDER_EMAIL, "smtp.host.local", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JavaMailSender must not be null");
    }

    @Test
    @DisplayName("3b. Constructor fails closed with IllegalStateException when SMTP host is missing")
    void testConstructorFailsOnMissingHost() {
        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(mailSender, SENDER_EMAIL, "", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMTP host ('spring.mail.host') is required");

        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(mailSender, SENDER_EMAIL, null, null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMTP host ('spring.mail.host') is required");
    }

    @Test
    @DisplayName("3c. Constructor fails closed with IllegalStateException when sender address is missing or invalid")
    void testConstructorFailsOnInvalidSender() {
        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(mailSender, "", "smtp.host.local", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Sender email address ('dentcare.email.from') is required");

        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(mailSender, "not-an-email", "smtp.host.local", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Configured sender address ('dentcare.email.from') is invalid");

        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(mailSender, "sender@test.com\r\nBcc: evil@test.com", "smtp.host.local", null, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("carriage return or newline");
    }

    @Test
    @DisplayName("3d. Constructor fails closed when SMTP username is configured but password is blank")
    void testConstructorFailsOnMissingPasswordWhenUsernameConfigured() {
        assertThatThrownBy(() -> new SmtpAppointmentEmailTransport(mailSender, SENDER_EMAIL, "smtp.host.local", "smtp_user", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SMTP password ('spring.mail.password') is required when SMTP username is configured");
    }

    @Test
    @DisplayName("13, 14, 15. Transport is an isolated transport abstraction with no database or appointment dependencies")
    void testTransportIsDecoupledFromDatabaseAndEntities() {
        // Assert class declaration implements only AppointmentEmailTransport
        Class<?>[] interfaces = SmtpAppointmentEmailTransport.class.getInterfaces();
        assertThat(interfaces).containsExactly(AppointmentEmailTransport.class);

        // Verify that transport holds no database entity manager or repositories
        assertThat(SmtpAppointmentEmailTransport.class.getDeclaredFields())
                .noneMatch(f -> f.getType().getSimpleName().contains("Repository") ||
                                f.getType().getSimpleName().contains("Appointment") ||
                                f.getType().getSimpleName().contains("EntityManager"));
    }
}
