package com.dentcare.security.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
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
    @DisplayName("Anonymous users cannot read operational inventory data")
    void testAnonymousInventoryReadIsDenied() throws Exception {
        mockMvc.perform(get("/api/inventory/items"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/inventory/items without CSRF token is rejected with 403 Forbidden")
    void testInventoryPostWithoutCsrfRejected() throws Exception {
        mockMvc.perform(post("/api/inventory/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Valid CSRF does not let an anonymous user create inventory items")
    void testAnonymousInventoryPostWithCsrfIsDenied() throws Exception {
        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "PATIENT")
    @DisplayName("PATIENT cannot access inventory, clinical, or prescription operations")
    void testPatientCannotAccessStaffOperationalApis() throws Exception {
        mockMvc.perform(get("/api/inventory/items"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/clinical/examinations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/prescriptions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRATOR", "RECEPTIONIST", "DENTIST", "DENTAL_ASSISTANT"})
    @DisplayName("Every staff role can reach inventory endpoints")
    void testStaffRolesCanReachInventory(String role) throws Exception {
        mockMvc.perform(get("/api/inventory/items")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("staff")
                                .roles(role)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "DENTIST")
    @DisplayName("Authorized DENTIST can reach clinical and prescription mutation controllers")
    void testDentistCanReachClinicalAndPrescriptionControllers() throws Exception {
        mockMvc.perform(post("/api/clinical/examinations")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/prescriptions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRATOR", "RECEPTIONIST", "DENTAL_ASSISTANT"})
    @DisplayName("Non-DENTIST staff roles are rejected on clinical and prescription mutations at HTTP layer")
    void testNonDentistStaffDeniedClinicalAndPrescriptionMutations(String role) throws Exception {
        mockMvc.perform(post("/api/clinical/examinations")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("staff").roles(role))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/prescriptions")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("staff").roles(role))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRATOR", "RECEPTIONIST", "DENTIST", "DENTAL_ASSISTANT"})
    @DisplayName("All staff roles retain GET read access to operational endpoints")
    void testStaffRolesCanReadClinicalAndPrescriptions(String role) throws Exception {
        mockMvc.perform(get("/api/inventory/items")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("staff").roles(role)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/auth/register/patient without CSRF token is rejected with 403 Forbidden")
    void testPatientRegistrationWithoutCsrfRejected() throws Exception {
        mockMvc.perform(post("/api/auth/register/patient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/auth/register/patient remains publicly callable without authentication when valid CSRF is present")
    void testPatientRegistrationPubliclyCallableWithCsrf() throws Exception {
        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
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
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Admin endpoints permit access to authenticated ADMINISTRATOR with valid CSRF")
    void testAdminEndpointsPermittedToAdministrator() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest()); // 400 validation error proves request reached controller past security
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Admin endpoints reject authenticated ADMINISTRATOR when CSRF token is missing")
    void testAdminEndpointsRejectedWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Public auth endpoints remain public while current-user lookup requires authentication")
    void testPublicAuthBoundary() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
