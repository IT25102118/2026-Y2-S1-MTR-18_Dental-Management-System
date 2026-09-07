package com.dentcare.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class SecurityConfigTest {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("PasswordEncoder bean is configured as BCryptPasswordEncoder")
    void testPasswordEncoderBeanIsBCrypt() {
        assertThat(passwordEncoder).isNotNull();
        assertThat(passwordEncoder).isInstanceOf(BCryptPasswordEncoder.class);
    }

    @Test
    @DisplayName("PasswordEncoder bean is available and matches valid passwords via PasswordEncoder.matches()")
    void testPasswordEncoderMatches() {
        String rawPassword = "SecurePassword123!";
        String encoded = passwordEncoder.encode(rawPassword);

        assertThat(encoded).isNotEqualTo(rawPassword);
        assertThat(passwordEncoder.matches(rawPassword, encoded)).isTrue();
        assertThat(passwordEncoder.matches("WrongPassword!", encoded)).isFalse();
    }

    @Test
    @DisplayName("BCrypt generates unique salts per hash while matches() validates both")
    void testBCryptSaltingVariation() {
        String rawPassword = "SaltingTestPassword123#";
        String hash1 = passwordEncoder.encode(rawPassword);
        String hash2 = passwordEncoder.encode(rawPassword);

        assertThat(hash1).isNotEqualTo(hash2);
        assertThat(passwordEncoder.matches(rawPassword, hash1)).isTrue();
        assertThat(passwordEncoder.matches(rawPassword, hash2)).isTrue();
    }

    @Test
    @DisplayName("Baseline permit-all security configuration allows unauthenticated access to existing endpoints")
    void testBaselinePermitAllAllowsAccess() throws Exception {
        mockMvc.perform(get("/api/inventory/items"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("CSRF is disabled on permit-all baseline, allowing POST requests without CSRF tokens")
    void testCsrfDisabledAllowsPostWithoutToken() throws Exception {
        mockMvc.perform(post("/api/inventory/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(403));
    }

    @Test
    @DisplayName("Patient registration remains publicly callable without authentication")
    void testPatientRegistrationPubliclyCallable() throws Exception {
        mockMvc.perform(post("/api/auth/register/patient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest()); // 400 validation error proves request reached controller past security
    }

    @Test
    @DisplayName("Admin endpoints reject unauthenticated callers with security denial")
    void testAdminEndpointsDeniedToAnonymous() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(401, 403);
                });
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Admin endpoints permit access to authenticated ADMINISTRATOR with valid CSRF")
    void testAdminEndpointsPermittedToAdministrator() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest()); // 400 validation error proves request reached controller past security
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Admin endpoints reject authenticated ADMINISTRATOR when CSRF token is missing")
    void testAdminEndpointsRejectedWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
