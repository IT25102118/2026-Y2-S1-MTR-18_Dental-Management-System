package com.dentcare.security.repository;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-auth.sql")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Persist and reload User for all five exact roles")
    void testPersistAndReloadAllFiveRoles() {
        for (Role role : Role.values()) {
            String email = "user." + role.name().toLowerCase() + "@dentcare.com";
            User user = new User(
                    email,
                    "$2a$10$abcdefghijklmnopqrstuvw1234567890abcdefghijklmnopqr",
                    "Test",
                    role.name(),
                    "0771234567",
                    role
            );
            User saved = userRepository.saveAndFlush(user);
            assertThat(saved.getId()).isNotNull();
            assertThat(saved.getRole()).isEqualTo(role);
            assertThat(saved.isActive()).isTrue();
            assertThat(saved.getCreatedAt()).isNotNull();
            assertThat(saved.getUpdatedAt()).isNotNull();

            Optional<User> reloaded = userRepository.findById(saved.getId());
            assertThat(reloaded).isPresent();
            assertThat(reloaded.get().getRole()).isEqualTo(role);
        }
        assertThat(Role.values()).hasSize(5);
    }

    @Test
    @DisplayName("Enforce unique normalized email constraint")
    void testUniqueEmailConstraint() {
        User user1 = new User(
                "reception@dentcare.com",
                "$2a$10$hashedPassword1",
                "Alice",
                "Perera",
                "0712345678",
                Role.RECEPTIONIST
        );
        userRepository.saveAndFlush(user1);

        User user2 = new User(
                "reception@dentcare.com",
                "$2a$10$hashedPassword2",
                "Bob",
                "Silva",
                "0718765432",
                Role.RECEPTIONIST
        );

        assertThatThrownBy(() -> userRepository.saveAndFlush(user2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Normalize email with trim and lowercase on persist")
    void testEmailNormalization() {
        User user = new User(
                "  Dr.Dentist@DentCare.COM  ",
                "$2a$10$hashedPassword3",
                "Sarah",
                "Fernando",
                null,
                Role.DENTIST
        );
        User saved = userRepository.saveAndFlush(user);

        assertThat(saved.getEmail()).isEqualTo("dr.dentist@dentcare.com");

        Optional<User> found = userRepository.findByEmailIgnoreCase("DR.DENTIST@DENTCARE.COM");
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());

        assertThat(userRepository.existsByEmailIgnoreCase("Dr.Dentist@dentcare.com")).isTrue();
    }

    @Test
    @DisplayName("Password is stored only as hash and never modified")
    void testPasswordStoredAsHash() {
        String testHash = "$2a$12$e8Y7zHkm81k0F5f9uM2H2e5E.vQOq8qg8K6mD9f.xXoVf1s2a3b4c";
        User user = new User(
                "assistant@dentcare.com",
                testHash,
                "Kamal",
                "Dias",
                "0755551234",
                Role.DENTAL_ASSISTANT
        );
        User saved = userRepository.saveAndFlush(user);

        User reloaded = userRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getPasswordHash()).isEqualTo(testHash);
    }

    @Test
    @DisplayName("Account active state defaults to true and can be toggled")
    void testActiveStateDefaultAndToggle() {
        User user = new User(
                "patient@dentcare.com",
                "$2a$10$hashedPassword4",
                "Nimal",
                "Bandara",
                "0723334444",
                Role.PATIENT
        );
        User saved = userRepository.saveAndFlush(user);
        assertThat(saved.isActive()).isTrue();

        saved.setActive(false);
        userRepository.saveAndFlush(saved);

        User reloaded = userRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.isActive()).isFalse();
    }

    @Test
    @DisplayName("Validation fails when required fields are blank")
    void testValidationRequiredFields() {
        User invalidUser = new User(
                "",
                "",
                "",
                "",
                null,
                null
        );

        assertThatThrownBy(() -> userRepository.saveAndFlush(invalidUser))
                .isInstanceOf(ConstraintViolationException.class);
    }
}
