package com.dentcare.security.bootstrap;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Executes an opt-in, environment-driven initial Administrator account bootstrap at application startup.
 * Ensures strict credential validation, idempotency, email collision safety, and password hashing.
 */
@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).+$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final AdminBootstrapProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrapRunner(AdminBootstrapProperties properties,
                                UserRepository userRepository,
                                PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            log.info("Administrator bootstrap disabled");
            return;
        }

        validateConfiguration();

        if (userRepository.existsByRole(Role.ADMINISTRATOR)) {
            log.info("Administrator already exists; bootstrap skipped");
            return;
        }

        String normalizedEmail = properties.getAdminEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new IllegalStateException("Cannot bootstrap administrator: an account with this email already exists");
        }

        String rawPassword = properties.getAdminPassword();
        String passwordHash = passwordEncoder.encode(rawPassword);

        User admin = new User(
                normalizedEmail,
                passwordHash,
                properties.getAdminFirstName().trim(),
                properties.getAdminLastName().trim(),
                null,
                Role.ADMINISTRATOR
        );

        userRepository.save(admin);
        log.info("Initial Administrator account created");
    }

    private void validateConfiguration() {
        String firstName = properties.getAdminFirstName();
        if (firstName == null || firstName.trim().isEmpty()) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-first-name must not be blank");
        }
        if (firstName.trim().length() > 60) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-first-name must not exceed 60 characters");
        }

        String lastName = properties.getAdminLastName();
        if (lastName == null || lastName.trim().isEmpty()) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-last-name must not be blank");
        }
        if (lastName.trim().length() > 60) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-last-name must not exceed 60 characters");
        }

        String email = properties.getAdminEmail();
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-email must not be blank");
        }
        if (email.trim().length() > 150) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-email must not exceed 150 characters");
        }
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-email must be a valid email address");
        }

        String password = properties.getAdminPassword();
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-password must not be blank");
        }
        if (password.length() < 8 || password.length() > 100) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-password length must be between 8 and 100 characters");
        }
        if (!PASSWORD_PATTERN.matcher(password).matches()) {
            throw new IllegalStateException("Administrator bootstrap failed: admin-password must contain at least one letter and one digit");
        }
    }
}
