package com.dentcare.security.controller;

import com.dentcare.security.config.SecurityConfig;
import com.dentcare.security.dto.StaffProvisioningRequest;
import com.dentcare.security.dto.StaffProvisioningResponse;
import com.dentcare.security.entity.Role;
import com.dentcare.security.exception.AuthExceptionHandler;
import com.dentcare.security.exception.DuplicateEmailException;
import com.dentcare.security.exception.InvalidStaffRoleException;
import com.dentcare.security.service.StaffProvisioningService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StaffProvisioningController.class)
@Import({SecurityConfig.class, AuthExceptionHandler.class})
class StaffProvisioningControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private StaffProvisioningService staffProvisioningService;

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Administrator mock can provision staff and receives 201 Created")
    void provisionStaff_adminMock_returns201() throws Exception {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "John",
                "Dentist",
                "john.dentist@example.com",
                "+1 555-0100",
                Role.DENTIST,
                "Password123"
        );

        StaffProvisioningResponse response = new StaffProvisioningResponse(
                1L,
                "john.dentist@example.com",
                "John",
                "Dentist",
                "+1 555-0100",
                Role.DENTIST,
                true,
                LocalDateTime.now()
        );

        when(staffProvisioningService.provisionStaff(any(StaffProvisioningRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.email", is("john.dentist@example.com")))
                .andExpect(jsonPath("$.firstName", is("John")))
                .andExpect(jsonPath("$.lastName", is("Dentist")))
                .andExpect(jsonPath("$.role", is("DENTIST")))
                .andExpect(jsonPath("$.active", is(true)))
                .andExpect(jsonPath("$.createdAt", notNullValue()));

        verify(staffProvisioningService).provisionStaff(any(StaffProvisioningRequest.class));
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with PATIENT role returns 400 Bad Request")
    void provisionStaff_patientRole_returns400() throws Exception {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Jane",
                "Patient",
                "patient@example.com",
                null,
                Role.PATIENT,
                "Password123"
        );

        when(staffProvisioningService.provisionStaff(any(StaffProvisioningRequest.class)))
                .thenThrow(new InvalidStaffRoleException("PATIENT role cannot be provisioned via staff endpoint"));

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("PATIENT role cannot be provisioned via staff endpoint")));
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with missing role returns 400 Bad Request")
    void provisionStaff_missingRole_returns400() throws Exception {
        String jsonPayload = """
                {
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "email": "jane.doe@example.com",
                    "password": "Password123"
                }
                """;

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.role", notNullValue()));

        verify(staffProvisioningService, never()).provisionStaff(any());
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with malformed/unknown role returns clean 400 Bad Request")
    void provisionStaff_malformedRole_returns400() throws Exception {
        String jsonPayload = """
                {
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "email": "jane.doe@example.com",
                    "role": "INVENTORY_CONTROLLER",
                    "password": "Password123"
                }
                """;

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("Malformed request body or invalid field value")));

        verify(staffProvisioningService, never()).provisionStaff(any());
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with invalid email returns 400 Bad Request")
    void provisionStaff_invalidEmail_returns400() throws Exception {
        String jsonPayload = """
                {
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "email": "not-an-email",
                    "role": "DENTIST",
                    "password": "Password123"
                }
                """;

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.email", notNullValue()));

        verify(staffProvisioningService, never()).provisionStaff(any());
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with missing names returns 400 Bad Request")
    void provisionStaff_missingNames_returns400() throws Exception {
        String jsonPayload = """
                {
                    "firstName": "   ",
                    "lastName": "",
                    "email": "valid@example.com",
                    "role": "DENTIST",
                    "password": "Password123"
                }
                """;

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.firstName", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.lastName", notNullValue()));

        verify(staffProvisioningService, never()).provisionStaff(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"short1", "alllettersnodigit", "1234567890", ""})
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with invalid password variants returns 400 Bad Request")
    void provisionStaff_invalidPasswordVariants_returns400(String invalidPassword) throws Exception {
        String jsonPayload = String.format("""
                {
                    "firstName": "Valid",
                    "lastName": "Name",
                    "email": "valid@example.com",
                    "role": "DENTIST",
                    "password": "%s"
                }
                """, invalidPassword);

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));

        verify(staffProvisioningService, never()).provisionStaff(any());
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR")
    @DisplayName("Request with duplicate email returns 409 Conflict")
    void provisionStaff_duplicateEmail_returns409() throws Exception {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "John",
                "Dentist",
                "existing@example.com",
                null,
                Role.DENTIST,
                "Password123"
        );

        when(staffProvisioningService.provisionStaff(any(StaffProvisioningRequest.class)))
                .thenThrow(new DuplicateEmailException("An account with email 'existing@example.com' already exists"));

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", is("An account with email 'existing@example.com' already exists")));
    }

    @Test
    @DisplayName("Anonymous caller to /api/admin/staff is denied access")
    void provisionStaff_anonymous_isDenied() throws Exception {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "John",
                "Dentist",
                "john.dentist@example.com",
                null,
                Role.DENTIST,
                "Password123"
        );

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 401 && status != 403) {
                        throw new AssertionError("Expected 401 or 403 for anonymous request, got: " + status);
                    }
                });

        verify(staffProvisioningService, never()).provisionStaff(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"RECEPTIONIST", "DENTIST", "DENTAL_ASSISTANT", "PATIENT"})
    @DisplayName("Every non-administrator role is denied access with 403 Forbidden")
    void provisionStaff_nonAdminRoles_forbidden(String role) throws Exception {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "John",
                "Dentist",
                "john.dentist@example.com",
                null,
                Role.DENTIST,
                "Password123"
        );

        mockMvc.perform(post("/api/admin/staff")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("user").roles(role))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(staffProvisioningService, never()).provisionStaff(any());
    }
}
