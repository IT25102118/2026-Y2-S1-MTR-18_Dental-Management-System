package com.dentcare.notification.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;

class SmtpEmailConfigurationTest {

    @Configuration
    static class MockMailSenderConfig {
        @Bean
        public JavaMailSender javaMailSender() {
            return Mockito.mock(JavaMailSender.class);
        }
    }

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(MockMailSenderConfig.class, SmtpAppointmentEmailTransport.class);

    @Test
    @DisplayName("1. Disabled configuration is the default: SmtpAppointmentEmailTransport is not registered")
    void testDisabledByDefault() {
        contextRunner.run(context -> {
            assertThat(context).doesNotHaveBean(SmtpAppointmentEmailTransport.class);
            assertThat(context).doesNotHaveBean(AppointmentEmailTransport.class);
        });
    }

    @Test
    @DisplayName("2. Explicitly disabled configuration: SmtpAppointmentEmailTransport is not registered")
    void testExplicitlyDisabled() {
        contextRunner
                .withPropertyValues("dentcare.email.smtp.enabled=false")
                .run(context -> {
                    assertThat(context).doesNotHaveBean(SmtpAppointmentEmailTransport.class);
                    assertThat(context).doesNotHaveBean(AppointmentEmailTransport.class);
                });
    }

    @Test
    @DisplayName("3a. Enabled with valid configuration: SmtpAppointmentEmailTransport bean is registered")
    void testEnabledWithValidConfiguration() {
        contextRunner
                .withPropertyValues(
                        "dentcare.email.smtp.enabled=true",
                        "dentcare.email.from=notifications@dentcare.test",
                        "spring.mail.host=smtp.dentcare.test"
                )
                .run(context -> {
                    assertThat(context).hasSingleBean(SmtpAppointmentEmailTransport.class);
                    assertThat(context).hasSingleBean(AppointmentEmailTransport.class);
                    SmtpAppointmentEmailTransport transport = context.getBean(SmtpAppointmentEmailTransport.class);
                    assertThat(transport.getFromAddress()).isEqualTo("notifications@dentcare.test");
                });
    }

    @Test
    @DisplayName("3b. Enabled with missing sender address fails closed on context startup")
    void testEnabledWithMissingFromAddressFailsClosed() {
        contextRunner
                .withPropertyValues(
                        "dentcare.email.smtp.enabled=true",
                        "spring.mail.host=smtp.dentcare.test"
                )
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseInstanceOf(IllegalStateException.class)
                            .hasRootCauseMessage("Sender email address ('dentcare.email.from') is required when dentcare.email.smtp.enabled=true");
                });
    }

    @Test
    @DisplayName("3c. Enabled with missing SMTP host fails closed on context startup")
    void testEnabledWithMissingHostFailsClosed() {
        contextRunner
                .withPropertyValues(
                        "dentcare.email.smtp.enabled=true",
                        "dentcare.email.from=notifications@dentcare.test"
                )
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseInstanceOf(IllegalStateException.class)
                            .hasRootCauseMessage("SMTP host ('spring.mail.host') is required when dentcare.email.smtp.enabled=true");
                });
    }

    @Test
    @DisplayName("3d. Enabled with invalid sender address format fails closed on context startup")
    void testEnabledWithInvalidFromAddressFailsClosed() {
        contextRunner
                .withPropertyValues(
                        "dentcare.email.smtp.enabled=true",
                        "dentcare.email.from=not-a-valid-email",
                        "spring.mail.host=smtp.dentcare.test"
                )
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .rootCause()
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessageContaining("Configured sender address ('dentcare.email.from') is invalid");
                });
    }
}
