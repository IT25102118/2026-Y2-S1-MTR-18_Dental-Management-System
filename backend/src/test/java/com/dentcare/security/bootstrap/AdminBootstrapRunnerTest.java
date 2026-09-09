package com.dentcare.security.bootstrap;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapRunnerTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private AdminBootstrapProperties properties;
    private AdminBootstrapRunner runner;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        properties = new AdminBootstrapProperties();
        runner = new AdminBootstrapRunner(properties, userRepository, passwordEncoder);
    }

    private void configureValidAdminProperties() {
        properties.setEnabled(true);
        properties.setAdminFirstName("  System  ");
        properties.setAdminLastName("  Admin  ");
        properties.setAdminEmail("  Admin@DentCare.COM  ");
        properties.setAdminPassword("SecurePass123");
    }

    @Nested
    @DisplayName("Disabled Bootstrap Behavior")
    class DisabledBootstrapTests {

        @Test
        @DisplayName("Bootstrap is disabled by default and performs no actions")
        void disabledByDefault_doesNothing() {
            assertThat(properties.isEnabled()).isFalse();

            runner.run(new DefaultApplicationArguments());

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Bootstrap disabled explicitly with blank credentials does not fail or query repository")
        void disabledExplicitly_doesNotValidateOrQuery() {
            properties.setEnabled(false);
            properties.setAdminFirstName("");
            properties.setAdminLastName("");
            properties.setAdminEmail("");
            properties.setAdminPassword("");

            runner.run(new DefaultApplicationArguments());

            verifyNoInteractions(userRepository);
        }
    }

    @Nested
    @DisplayName("Successful Bootstrap Execution")
    class SuccessfulBootstrapTests {

        @Test
        @DisplayName("Bootstrap creates single Administrator with trimmed names, normalized email, and BCrypt hash")
        void successfulBootstrap_createsAdministrator() {
            configureValidAdminProperties();
            when(userRepository.existsByRole(Role.ADMINISTRATOR)).thenReturn(false);
            when(userRepository.findByEmailIgnoreCase("admin@dentcare.com")).thenReturn(Optional.empty());

            runner.run(new DefaultApplicationArguments());

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());

            User saved = captor.getValue();
            assertThat(saved.getFirstName()).isEqualTo("System");
            assertThat(saved.getLastName()).isEqualTo("Admin");
            assertThat(saved.getEmail()).isEqualTo("admin@dentcare.com");
            assertThat(saved.getPhone()).isNull();
            assertThat(saved.getRole()).isEqualTo(Role.ADMINISTRATOR);
            assertThat(saved.isActive()).isTrue();
            assertThat(saved.getPasswordHash()).isNotEqualTo("SecurePass123");
            assertThat(passwordEncoder.matches("SecurePass123", saved.getPasswordHash())).isTrue();
        }
    }

    @Nested
    @DisplayName("Existing Administrator Idempotency")
    class ExistingAdministratorTests {

        @Test
        @DisplayName("When Administrator already exists, bootstrap skips without saving or modifying")
        void existingAdmin_skipsBootstrap() {
            configureValidAdminProperties();
            when(userRepository.existsByRole(Role.ADMINISTRATOR)).thenReturn(true);

            runner.run(new DefaultApplicationArguments());

            verify(userRepository, never()).findByEmailIgnoreCase(anyString());
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Email Conflict Safety")
    class EmailConflictTests {

        @Test
        @DisplayName("When email is already taken by a non-administrator, bootstrap fails safely")
        void emailConflictWithNonAdmin_failsSafely() {
            configureValidAdminProperties();
            when(userRepository.existsByRole(Role.ADMINISTRATOR)).thenReturn(false);

            User existingPatient = new User("admin@dentcare.com", "hash", "Existing", "Patient", null, Role.PATIENT);
            when(userRepository.findByEmailIgnoreCase("admin@dentcare.com")).thenReturn(Optional.of(existingPatient));

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot bootstrap administrator")
                    .hasMessageNotContaining("SecurePass123");

            verify(userRepository, never()).save(any());
            assertThat(existingPatient.getRole()).isEqualTo(Role.PATIENT);
        }
    }

    @Nested
    @DisplayName("Configuration Validation")
    class ConfigurationValidationTests {

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\n"})
        @DisplayName("Missing first name fails startup before repository interaction")
        void missingFirstName_throws(String invalidFirstName) {
            configureValidAdminProperties();
            properties.setAdminFirstName(invalidFirstName);

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-first-name must not be blank")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("First name exceeding 60 characters fails startup")
        void firstNameExceedsLimit_throws() {
            configureValidAdminProperties();
            properties.setAdminFirstName("A".repeat(61));

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-first-name must not exceed 60 characters")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\n"})
        @DisplayName("Missing last name fails startup before repository interaction")
        void missingLastName_throws(String invalidLastName) {
            configureValidAdminProperties();
            properties.setAdminLastName(invalidLastName);

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-last-name must not be blank")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Last name exceeding 60 characters fails startup")
        void lastNameExceedsLimit_throws() {
            configureValidAdminProperties();
            properties.setAdminLastName("B".repeat(61));

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-last-name must not exceed 60 characters")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t", "\n"})
        @DisplayName("Missing email fails startup before repository interaction")
        void missingEmail_throws(String invalidEmail) {
            configureValidAdminProperties();
            properties.setAdminEmail(invalidEmail);

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-email must not be blank")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Email exceeding 150 characters fails startup")
        void emailExceedsLimit_throws() {
            configureValidAdminProperties();
            properties.setAdminEmail("a".repeat(140) + "@example.com");

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-email must not exceed 150 characters")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @ParameterizedTest
        @ValueSource(strings = {"not-an-email", "admin@", "@domain.com", "admin@domain"})
        @DisplayName("Invalid email format fails startup")
        void invalidEmailFormat_throws(String invalidEmail) {
            configureValidAdminProperties();
            properties.setAdminEmail(invalidEmail);

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-email must be a valid email address")
                    .hasMessageNotContaining("SecurePass123");

            verifyNoInteractions(userRepository);
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"", "   "})
        @DisplayName("Missing password fails startup before repository interaction")
        void missingPassword_throws(String invalidPassword) {
            configureValidAdminProperties();
            properties.setAdminPassword(invalidPassword);

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-password must not be blank");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Password shorter than 8 characters fails startup")
        void passwordTooShort_throws() {
            configureValidAdminProperties();
            properties.setAdminPassword("Pass1");

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-password length must be between 8 and 100 characters")
                    .hasMessageNotContaining("Pass1");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Password longer than 100 characters fails startup")
        void passwordTooLong_throws() {
            configureValidAdminProperties();
            properties.setAdminPassword("Pass1" + "A".repeat(96));

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-password length must be between 8 and 100 characters");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Password without letter fails startup")
        void passwordWithoutLetter_throws() {
            configureValidAdminProperties();
            properties.setAdminPassword("123456789");

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-password must contain at least one letter and one digit")
                    .hasMessageNotContaining("123456789");

            verifyNoInteractions(userRepository);
        }

        @Test
        @DisplayName("Password without digit fails startup")
        void passwordWithoutDigit_throws() {
            configureValidAdminProperties();
            properties.setAdminPassword("PasswordOnly");

            assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("admin-password must contain at least one letter and one digit")
                    .hasMessageNotContaining("PasswordOnly");

            verifyNoInteractions(userRepository);
        }
    }

    @Nested
    @DisplayName("Credential Exposure Protection")
    class CredentialProtectionTests {

        @Test
        @DisplayName("AdminBootstrapProperties.toString() masks adminPassword")
        void toString_masksPassword() {
            configureValidAdminProperties();
            String stringRep = properties.toString();

            assertThat(stringRep).doesNotContain("SecurePass123");
            assertThat(stringRep).contains("[PROTECTED]");
            assertThat(stringRep).contains("enabled=true");
            assertThat(stringRep).contains("adminEmail=");
        }
    }
}
