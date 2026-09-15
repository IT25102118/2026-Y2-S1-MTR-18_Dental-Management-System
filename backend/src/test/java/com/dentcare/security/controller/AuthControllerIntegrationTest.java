package com.dentcare.security.controller;

import com.dentcare.security.dto.LoginRequest;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.lang.reflect.Field;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-inventory.sql")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SessionAuthenticationStrategy sessionAuthenticationStrategy;

    @Autowired
    private CsrfTokenRepository csrfTokenRepository;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private jakarta.servlet.ServletContext servletContext;

    private User activeDentist;
    private User inactiveUser;

    @BeforeEach
    void setUp() {
        resetCsrfFilterState();
        userRepository.deleteAll();

        activeDentist = new User(
                "dentist@dentcare.com",
                passwordEncoder.encode("Password123"),
                "Alice",
                "Perera",
                "0771234567",
                Role.DENTIST
        );
        activeDentist.setActive(true);
        activeDentist = userRepository.saveAndFlush(activeDentist);

        inactiveUser = new User(
                "inactive@dentcare.com",
                passwordEncoder.encode("Password123"),
                "Bob",
                "Silva",
                "0779876543",
                Role.RECEPTIONIST
        );
        inactiveUser.setActive(false);
        inactiveUser = userRepository.saveAndFlush(inactiveUser);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        resetCsrfFilterState();
    }

    private void resetCsrfFilterState() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        org.springframework.mock.web.MockHttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest(servletContext);
        org.springframework.security.test.web.support.WebTestUtils.setCsrfTokenRepository(request, csrfTokenRepository);
    }

    // =========================================================================
    // CSRF Endpoint (/api/auth/csrf) Tests
    // =========================================================================

    @Test
    @DisplayName("GET /api/auth/csrf works anonymously, materializes token, and emits XSRF-TOKEN cookie")
    void csrf_anonymousGet_materializesTokenAndEmitsCookie() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.headerName", is("X-XSRF-TOKEN")))
                .andExpect(jsonPath("$.parameterName", is("_csrf")))
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        assertThat(token).isNotBlank();

        Cookie xsrfCookie = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(xsrfCookie).isNotNull();
        assertThat(xsrfCookie.getValue()).isEqualTo(token);
        assertThat(xsrfCookie.getPath()).isEqualTo("/");
        assertThat(xsrfCookie.isHttpOnly()).isFalse();
    }

    // =========================================================================
    // Login Tests
    // =========================================================================

    @Test
    @DisplayName("Valid credentials succeed, return safe DTO, persist SecurityContext in session, and /me succeeds")
    void login_validCredentials_persistsSecurityContextAndReturnsSafeUser() throws Exception {
        LoginRequest request = new LoginRequest("dentist@dentcare.com", "Password123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(activeDentist.getId().intValue())))
                .andExpect(jsonPath("$.email", is("dentist@dentcare.com")))
                .andExpect(jsonPath("$.firstName", is("Alice")))
                .andExpect(jsonPath("$.lastName", is("Perera")))
                .andExpect(jsonPath("$.phone", is("0771234567")))
                .andExpect(jsonPath("$.role", is("DENTIST")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.sessionId").doesNotExist())
                .andExpect(jsonPath("$.authorities").doesNotExist())
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        assertThat(session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY))
                .isNotNull();

        // Verify subsequent call to /api/auth/me with the same session returns 200
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(activeDentist.getId().intValue())))
                .andExpect(jsonPath("$.email", is("dentist@dentcare.com")))
                .andExpect(jsonPath("$.role", is("DENTIST")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("Case-insensitive email matches persistent record and establishes session")
    void login_caseInsensitiveEmail_succeeds() throws Exception {
        LoginRequest request = new LoginRequest("DENTIST@DentCare.com", "Password123");

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("dentist@dentcare.com")))
                .andExpect(jsonPath("$.role", is("DENTIST")));
    }

    @Test
    @DisplayName("Unknown email, wrong password, and inactive account all return identical sanitized 401")
    void login_failureUniformity_noAccountEnumeration() throws Exception {
        LoginRequest unknownEmail = new LoginRequest("unknown@dentcare.com", "Password123");
        LoginRequest wrongPassword = new LoginRequest("dentist@dentcare.com", "WrongPassword999");
        LoginRequest inactiveAccount = new LoginRequest("inactive@dentcare.com", "Password123");

        MvcResult resUnknown = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unknownEmail)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        MvcResult resWrongPw = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongPassword)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        MvcResult resInactive = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inactiveAccount)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        JsonNode jsonUnknown = objectMapper.readTree(resUnknown.getResponse().getContentAsString());
        JsonNode jsonWrongPw = objectMapper.readTree(resWrongPw.getResponse().getContentAsString());
        JsonNode jsonInactive = objectMapper.readTree(resInactive.getResponse().getContentAsString());

        assertThat(jsonUnknown.get("status").asInt()).isEqualTo(401);
        assertThat(jsonUnknown.get("error").asText()).isEqualTo("Unauthorized");
        assertThat(jsonUnknown.get("message").asText()).isEqualTo("Invalid email or password");

        assertThat(jsonWrongPw.get("status").asInt()).isEqualTo(401);
        assertThat(jsonWrongPw.get("error").asText()).isEqualTo("Unauthorized");
        assertThat(jsonWrongPw.get("message").asText()).isEqualTo("Invalid email or password");

        assertThat(jsonInactive.get("status").asInt()).isEqualTo(401);
        assertThat(jsonInactive.get("error").asText()).isEqualTo("Unauthorized");
        assertThat(jsonInactive.get("message").asText()).isEqualTo("Invalid email or password");
    }

    @Test
    @DisplayName("Validation fails with 400 for malformed login requests without enforcing registration complexity")
    void login_validationRules() throws Exception {
        // Missing email
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"Password123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()));

        // Invalid email format
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"Password123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()));

        // Missing password
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"dentist@dentcare.com\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));

        // Excessive password length (> 100 chars)
        String longPassword = "a".repeat(101);
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"dentist@dentcare.com\",\"password\":\"" + longPassword + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));

        // Simple password without special chars/digits is accepted by login validation (reaches auth -> 401 wrong password)
        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"dentist@dentcare.com\",\"password\":\"simple\"}"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // Current User (/api/auth/me) Tests
    // =========================================================================

    @Test
    @DisplayName("Anonymous request to /api/auth/me returns JSON 401 without redirect")
    void me_anonymous_returnsJson401NoRedirect() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", is("Authentication required")));
    }

    @Test
    @DisplayName("Authenticated session returns safe profile and does not leak credentials")
    void me_authenticatedSession_returnsSafeDto() throws Exception {
        LoginRequest request = new LoginRequest("dentist@dentcare.com", "Password123");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).isNotNull();

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(activeDentist.getId().intValue())))
                .andExpect(jsonPath("$.email", is("dentist@dentcare.com")))
                .andExpect(jsonPath("$.firstName", is("Alice")))
                .andExpect(jsonPath("$.lastName", is("Perera")))
                .andExpect(jsonPath("$.phone", is("0771234567")))
                .andExpect(jsonPath("$.role", is("DENTIST")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    // =========================================================================
    // CSRF Enforcement Tests
    // =========================================================================

    @Test
    @DisplayName("POST /api/auth/login without CSRF returns JSON 403 Access Denied")
    void login_withoutCsrf_returns403() throws Exception {
        LoginRequest request = new LoginRequest("dentist@dentcare.com", "Password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", is("Access denied")));
    }

    @Test
    @DisplayName("POST /api/auth/login with valid CSRF reaches authentication logic")
    void login_withCsrf_executesAuthentication() throws Exception {
        LoginRequest request = new LoginRequest("dentist@dentcare.com", "Password123");

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/auth/logout without CSRF returns 403 Forbidden")
    void logout_withoutCsrf_returns403() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")));
    }

    @Test
    @DisplayName("POST /api/auth/logout with CSRF invalidates session and subsequent /me returns 401")
    void logout_withCsrf_invalidatesSessionAndClearsContext() throws Exception {
        // 1. Establish session
        LoginRequest request = new LoginRequest("dentist@dentcare.com", "Password123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).isNotNull();

        // 2. Logout with CSRF and the active session
        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message", is("Successfully logged out")));

        // 3. Verify session was invalidated
        assertThat(session.isInvalid()).isTrue();

        // 4. Subsequent request with invalidated session returns 401
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // Role Authorization on Admin Endpoints with Valid CSRF
    // =========================================================================

    @Test
    @DisplayName("Anonymous request to /api/admin/staff with valid CSRF returns 401 Unauthorized")
    void adminStaff_anonymousWithCsrf_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")))
                .andExpect(jsonPath("$.message", is("Authentication required")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"RECEPTIONIST", "DENTIST", "DENTAL_ASSISTANT", "PATIENT"})
    @DisplayName("Non-administrator roles with valid CSRF receive 403 Forbidden")
    void adminStaff_nonAdminRolesWithCsrf_forbidden(String role) throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user("user").roles(role))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", is("Access denied")));
    }

    @Test
    @DisplayName("ADMINISTRATOR with valid CSRF reaches controller (400 on empty payload proves entry past security)")
    void adminStaff_adminWithCsrf_permittedToController() throws Exception {
        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // CSRF Enforcement Matrix (PR-D4)
    // =========================================================================

    @Test
    @DisplayName("POST /api/auth/register/patient without CSRF is rejected with 403 Forbidden")
    void patientRegistration_withoutCsrf_rejected() throws Exception {
        mockMvc.perform(post("/api/auth/register/patient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with valid CSRF reaches controller (400 validation error proves entry past security)")
    void patientRegistration_withCsrf_reachesController() throws Exception {
        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/inventory/items without CSRF is rejected with 403 Forbidden")
    void inventoryItemCreate_withoutCsrf_rejected() throws Exception {
        mockMvc.perform(post("/api/inventory/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/inventory/items with valid CSRF still rejects anonymous users")
    void inventoryItemCreate_withCsrf_rejectsAnonymous() throws Exception {
        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PUT /api/inventory/items/{id} without CSRF is rejected with 403 Forbidden")
    void inventoryItemUpdate_withoutCsrf_rejected() throws Exception {
        mockMvc.perform(put("/api/inventory/items/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/inventory/items/{id} with valid CSRF still rejects anonymous users")
    void inventoryItemUpdate_withCsrf_rejectsAnonymous() throws Exception {
        mockMvc.perform(put("/api/inventory/items/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PATCH /api/inventory/items/{id}/status without CSRF is rejected with 403 Forbidden")
    void inventoryItemStatus_withoutCsrf_rejected() throws Exception {
        mockMvc.perform(patch("/api/inventory/items/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH /api/inventory/items/{id}/status with valid CSRF still rejects anonymous users")
    void inventoryItemStatus_withCsrf_rejectsAnonymous() throws Exception {
        mockMvc.perform(patch("/api/inventory/items/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/inventory/items/{itemId}/movements without CSRF is rejected with 403 Forbidden")
    void stockMovement_withoutCsrf_rejected() throws Exception {
        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/inventory/items/{itemId}/movements with valid CSRF still rejects anonymous users")
    void stockMovement_withCsrf_rejectsAnonymous() throws Exception {
        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/inventory/items/{itemId}/movements/{movementId}/reverse without CSRF is rejected with 403 Forbidden")
    void stockMovementReversal_withoutCsrf_rejected() throws Exception {
        mockMvc.perform(post("/api/inventory/items/1/movements/1/reverse")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/inventory/items/{itemId}/movements/{movementId}/reverse with valid CSRF still rejects anonymous users")
    void stockMovementReversal_withCsrf_rejectsAnonymous() throws Exception {
        mockMvc.perform(post("/api/inventory/items/1/movements/1/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/inventory/items requires authentication")
    void inventoryGet_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/inventory/items"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // Session Strategy Verification
    // =========================================================================

    @Test
    @DisplayName("SessionAuthenticationStrategy is CompositeSessionAuthenticationStrategy containing ChangeSessionId and Csrf strategies")
    @SuppressWarnings("unchecked")
    void sessionStrategy_configuredProperly() throws Exception {
        assertThat(sessionAuthenticationStrategy).isInstanceOf(CompositeSessionAuthenticationStrategy.class);

        Field delegateField = CompositeSessionAuthenticationStrategy.class.getDeclaredField("delegateStrategies");
        delegateField.setAccessible(true);
        List<SessionAuthenticationStrategy> delegates = (List<SessionAuthenticationStrategy>) delegateField.get(sessionAuthenticationStrategy);

        assertThat(delegates).hasSize(2);
        assertThat(delegates.get(0)).isInstanceOf(ChangeSessionIdAuthenticationStrategy.class);
        assertThat(delegates.get(1)).isInstanceOf(CsrfAuthenticationStrategy.class);
    }

    @Test
    @DisplayName("Login with pre-existing session changes session identifier (session fixation protection)")
    void login_changesPreExistingSessionId() throws Exception {
        MockHttpSession existingSession = new MockHttpSession();
        String originalSessionId = existingSession.getId();

        LoginRequest request = new LoginRequest("dentist@dentcare.com", "Password123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .session(existingSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession resultSession = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(resultSession).isNotNull();
        assertThat(resultSession.getId()).isNotEqualTo(originalSessionId);
    }
}
