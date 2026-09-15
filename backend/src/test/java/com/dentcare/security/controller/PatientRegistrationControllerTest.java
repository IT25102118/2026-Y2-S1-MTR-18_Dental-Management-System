package com.dentcare.security.controller;

import com.dentcare.security.dto.PatientRegistrationRequest;
import com.dentcare.security.dto.PatientRegistrationResponse;
import com.dentcare.security.entity.Role;
import com.dentcare.security.exception.AuthExceptionHandler;
import com.dentcare.security.exception.DuplicateEmailException;
import com.dentcare.security.service.PatientRegistrationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PatientRegistrationController.class)
@Import(AuthExceptionHandler.class)
class PatientRegistrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PatientRegistrationService patientRegistrationService;

    @Test
    @DisplayName("POST /api/auth/register/patient with valid payload returns 201 Created and safe response")
    void register_validPayload_returns201() throws Exception {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "Sarah",
                "Connor",
                "sarah@example.com",
                "+1 555-0100",
                "Password123"
        );

        PatientRegistrationResponse response = new PatientRegistrationResponse(
                1L,
                "sarah@example.com",
                "Sarah",
                "Connor",
                "+1 555-0100",
                Role.PATIENT,
                true,
                LocalDateTime.of(2026, 9, 6, 10, 0)
        );

        when(patientRegistrationService.registerPatient(any(PatientRegistrationRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.email", is("sarah@example.com")))
                .andExpect(jsonPath("$.firstName", is("Sarah")))
                .andExpect(jsonPath("$.lastName", is("Connor")))
                .andExpect(jsonPath("$.phone", is("+1 555-0100")))
                .andExpect(jsonPath("$.role", is("PATIENT")))
                .andExpect(jsonPath("$.active", is(true)))
                .andExpect(jsonPath("$.createdAt", notNullValue()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("Malicious client-provided role in JSON payload cannot override PATIENT role")
    void register_maliciousRoleInJson_isIgnoredAndRemainsPatient() throws Exception {
        String payloadWithAdminRole = """
                {
                    "firstName": "Attacker",
                    "lastName": "User",
                    "email": "attacker@example.com",
                    "password": "Password123",
                    "role": "ADMINISTRATOR"
                }
                """;

        PatientRegistrationResponse response = new PatientRegistrationResponse(
                2L,
                "attacker@example.com",
                "Attacker",
                "User",
                null,
                Role.PATIENT,
                true,
                LocalDateTime.now()
        );

        when(patientRegistrationService.registerPatient(any(PatientRegistrationRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithAdminRole))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("PATIENT")));

        ArgumentCaptor<PatientRegistrationRequest> captor = ArgumentCaptor.forClass(PatientRegistrationRequest.class);
        verify(patientRegistrationService).registerPatient(captor.capture());
        PatientRegistrationRequest captured = captor.getValue();
        assertEquals("Attacker", captured.firstName());
        assertEquals("attacker@example.com", captured.email());
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with missing/blank fields returns 400 Bad Request")
    void register_missingRequiredFields_returns400() throws Exception {
        PatientRegistrationRequest invalid = new PatientRegistrationRequest(
                "   ",
                "",
                "   ",
                null,
                "   "
        );

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.firstName", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.lastName", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with invalid email format returns 400 Bad Request")
    void register_invalidEmailFormat_returns400() throws Exception {
        PatientRegistrationRequest invalid = new PatientRegistrationRequest(
                "John",
                "Doe",
                "invalid-email-string",
                null,
                "Password123"
        );

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with password shorter than 8 chars returns 400 Bad Request")
    void register_shortPassword_returns400() throws Exception {
        PatientRegistrationRequest invalid = new PatientRegistrationRequest(
                "John",
                "Doe",
                "john@example.com",
                null,
                "Pass1"
        );

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with password lacking digits returns 400 Bad Request")
    void register_passwordWithoutDigit_returns400() throws Exception {
        PatientRegistrationRequest invalid = new PatientRegistrationRequest(
                "John",
                "Doe",
                "john@example.com",
                null,
                "PasswordOnlyLetters"
        );

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with password lacking letters returns 400 Bad Request")
    void register_passwordWithoutLetter_returns400() throws Exception {
        PatientRegistrationRequest invalid = new PatientRegistrationRequest(
                "John",
                "Doe",
                "john@example.com",
                null,
                "12345678"
        );

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/auth/register/patient with duplicate email returns 409 Conflict")
    void register_duplicateEmail_returns409() throws Exception {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "John",
                "Doe",
                "existing@example.com",
                null,
                "Password123"
        );

        when(patientRegistrationService.registerPatient(any(PatientRegistrationRequest.class)))
                .thenThrow(new DuplicateEmailException("A user with email existing@example.com already exists."));

        mockMvc.perform(post("/api/auth/register/patient")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("existing@example.com")));
    }
}
