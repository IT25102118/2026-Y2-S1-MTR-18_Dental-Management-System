package com.dentcare.security.bootstrap;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test verifying real Spring context startup, H2 database persistence,
 * password hashing, idempotency, and credential log safety during Administrator bootstrap.
 */
@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
@TestPropertySource(properties = {
        "spring.sql.init.schema-locations=classpath:schema-auth.sql",
        "dentcare.security.bootstrap.enabled=true",
        "dentcare.security.bootstrap.admin-first-name=System",
        "dentcare.security.bootstrap.admin-last-name=Administrator",
        "dentcare.security.bootstrap.admin-email=bootstrap.admin@dentcare.com",
        "dentcare.security.bootstrap.admin-password=BootstrapSecret999"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminBootstrapIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AdminBootstrapRunner bootstrapRunner;

    @Test
    @DisplayName("Application startup creates Administrator in H2 with hashed password and without leaking raw password")
    void testStartupBootstrapPersistenceAndCredentialSafety(CapturedOutput output) {
        // 1. Verify existence of administrator in real repository
        assertThat(userRepository.existsByRole(Role.ADMINISTRATOR)).isTrue();

        Optional<User> adminOpt = userRepository.findByEmailIgnoreCase("bootstrap.admin@dentcare.com");
        assertThat(adminOpt).isPresent();

        User admin = adminOpt.get();
        assertThat(admin.getFirstName()).isEqualTo("System");
        assertThat(admin.getLastName()).isEqualTo("Administrator");
        assertThat(admin.getEmail()).isEqualTo("bootstrap.admin@dentcare.com");
        assertThat(admin.getPhone()).isNull();
        assertThat(admin.getRole()).isEqualTo(Role.ADMINISTRATOR);
        assertThat(admin.isActive()).isTrue();

        // 2. Verify password hashing
        assertThat(admin.getPasswordHash()).isNotEqualTo("BootstrapSecret999");
        assertThat(passwordEncoder.matches("BootstrapSecret999", admin.getPasswordHash())).isTrue();

        // 3. Verify logging and credential safety
        assertThat(output.getAll()).contains("Initial Administrator account created");
        assertThat(output.getAll()).doesNotContain("BootstrapSecret999");
    }

    @Test
    @DisplayName("Subsequent bootstrap runner invocation is idempotent and logs skipped message safely")
    void testSubsequentBootstrapIsIdempotent(CapturedOutput output) {
        long initialCount = userRepository.count();

        bootstrapRunner.run(new DefaultApplicationArguments());

        assertThat(userRepository.count()).isEqualTo(initialCount);
        assertThat(output.getAll()).contains("Administrator already exists; bootstrap skipped");
        assertThat(output.getAll()).doesNotContain("BootstrapSecret999");
    }
}
