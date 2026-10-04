package com.dentcare.patient.controller;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.exception.PatientExceptionHandler;
import com.dentcare.patient.service.PatientPortalService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PatientPortalController.class)
@Import(PatientExceptionHandler.class)
class PatientPortalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PatientPortalService patientPortalService;

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/dashboard returns 200 OK with patient summary and features")
    void testGetDashboardSummary() throws Exception {
        PatientDashboardSummaryResponse.PatientProfileSummary profile =
                new PatientDashboardSummaryResponse.PatientProfileSummary(
                        10L,
                        "Alice",
                        "Smith",
                        "alice@dentcare.test",
                        "+1 555-0101",
                        "PATIENT",
                        true,
                        LocalDateTime.of(2026, 9, 1, 10, 0),
                        "PAT-101",
                        true,
                        "FEMALE",
                        LocalDate.of(1990, 5, 15)
                );

        PatientDashboardSummaryResponse.ClinicalStatus clinical =
                new PatientDashboardSummaryResponse.ClinicalStatus(
                        true,
                        "PAT-101",
                        "COMPLETED",
                        "Active clinical file."
                );

        PatientDashboardSummaryResponse.PrescriptionsSummary prescriptions =
                new PatientDashboardSummaryResponse.PrescriptionsSummary(
                        2L,
                        1L,
                        List.of()
                );

        List<PatientDashboardSummaryResponse.PortalFeatureResponse> features = List.of(
                new PatientDashboardSummaryResponse.PortalFeatureResponse("profile", "My Profile", "Profile info", "/account", "AVAILABLE"),
                new PatientDashboardSummaryResponse.PortalFeatureResponse("prescriptions", "My Prescriptions", "Prescriptions", "/patient/dashboard", "AVAILABLE"),
                new PatientDashboardSummaryResponse.PortalFeatureResponse("appointments", "Appointments", "Booking", null, "COMING_SOON")
        );

        when(patientPortalService.getDashboardSummary(eq("alice@dentcare.test")))
                .thenReturn(new PatientDashboardSummaryResponse(profile, clinical, prescriptions, features));

        mockMvc.perform(get("/api/patient/me/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patient.firstName", is("Alice")))
                .andExpect(jsonPath("$.patient.email", is("alice@dentcare.test")))
                .andExpect(jsonPath("$.patient.patientCode", is("PAT-101")))
                .andExpect(jsonPath("$.clinicalStatus.intakeStatus", is("COMPLETED")))
                .andExpect(jsonPath("$.prescriptionsSummary.totalCount", is(2)))
                .andExpect(jsonPath("$.availableFeatures", hasSize(3)))
                .andExpect(jsonPath("$.availableFeatures[2].status", is("COMING_SOON")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/prescriptions returns 200 OK with patient's prescription list")
    void testGetPatientPrescriptions() throws Exception {
        PatientPrescriptionItemResponse item = new PatientPrescriptionItemResponse(
                1L,
                "FINALIZED",
                "Dr. Sarah Connor",
                "Take with meals",
                LocalDateTime.of(2026, 10, 1, 14, 0),
                LocalDateTime.of(2026, 10, 1, 14, 15),
                List.of(new PatientPrescriptionItemResponse.PatientPrescriptionItemDetail(
                        101L, "Amoxicillin", "500mg", "TID", "7 days", "Take full course"
                ))
        );

        when(patientPortalService.getPatientPrescriptions(eq("alice@dentcare.test")))
                .thenReturn(List.of(item));

        mockMvc.perform(get("/api/patient/me/prescriptions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].dentistName", is("Dr. Sarah Connor")))
                .andExpect(jsonPath("$[0].items[0].medicineName", is("Amoxicillin")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/prescriptions/{id} returns 403 Forbidden when patient does not own prescription")
    void testGetPrescriptionCrossPatientAccessDenied() throws Exception {
        when(patientPortalService.getPatientPrescriptionById(eq("alice@dentcare.test"), eq(999L)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: prescription does not belong to the authenticated patient"));

        mockMvc.perform(get("/api/patient/me/prescriptions/999"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithAnonymousUser
    @DisplayName("Anonymous requests to /api/patient/me/** return 401 Unauthorized")
    void testAnonymousAccessUnauthorized() throws Exception {
        mockMvc.perform(get("/api/patient/me/dashboard"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/patient/me/appointments"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments returns 201 Created on valid request")
    void testCreateAppointmentSuccess() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        PatientAppointmentResponse apptResponse = new PatientAppointmentResponse(
                501L,
                futureDate,
                "10:00",
                "Routine checkup",
                "Morning please",
                "PENDING",
                "Pending confirmation",
                null,
                LocalDateTime.now()
        );

        when(patientPortalService.createAppointmentRequest(eq("alice@dentcare.test"), any(CreateAppointmentRequest.class)))
                .thenReturn(apptResponse);

        String jsonPayload = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "10:00",
                    "reason": "Routine checkup",
                    "notes": "Morning please"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(501)))
                .andExpect(jsonPath("$.reason", is("Routine checkup")))
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andExpect(jsonPath("$.statusDescription", is("Pending confirmation")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with missing reason returns 400 Bad Request")
    void testCreateAppointmentValidationFailure() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        String invalidPayload = """
                {
                    "appointmentDate": "%s",
                    "reason": ""
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with past date returns 400 Bad Request")
    void testCreateAppointmentPastDateValidationFailure() throws Exception {
        LocalDate pastDate = LocalDate.now().minusDays(2);
        String invalidPayload = """
                {
                    "appointmentDate": "%s",
                    "reason": "Dental pain"
                }
                """.formatted(pastDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with malformed 'morning' preferred time is rejected with 400 Bad Request")
    void testCreateAppointmentMalformedPreferredTimeMorningRejected() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        String invalidPayload = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "morning",
                    "reason": "Checkup"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.preferredTime").exists());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with '9am' preferred time is rejected with 400 Bad Request")
    void testCreateAppointmentMalformedPreferredTime9amRejected() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        String invalidPayload = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "9am",
                    "reason": "Checkup"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.preferredTime").exists());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with '25:00' preferred time is rejected with 400 Bad Request")
    void testCreateAppointmentInvalidHour2500Rejected() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        String invalidPayload = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "25:00",
                    "reason": "Checkup"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.preferredTime").exists());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with '09:75' preferred time is rejected with 400 Bad Request")
    void testCreateAppointmentInvalidMinute0975Rejected() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        String invalidPayload = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "09:75",
                    "reason": "Checkup"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.preferredTime").exists());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with null/blank preferred time is accepted")
    void testCreateAppointmentNullOrBlankPreferredTimeAccepted() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        PatientAppointmentResponse apptResponse = new PatientAppointmentResponse(
                505L,
                futureDate,
                null,
                "Consultation",
                null,
                "PENDING",
                "Pending confirmation",
                null,
                LocalDateTime.now()
        );

        when(patientPortalService.createAppointmentRequest(eq("alice@dentcare.test"), any(CreateAppointmentRequest.class)))
                .thenReturn(apptResponse);

        String payloadWithBlank = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "",
                    "reason": "Consultation"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithBlank))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(505)));

        String payloadWithNull = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": null,
                    "reason": "Consultation"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payloadWithNull))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(505)));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with 23:59 preferred time is accepted")
    void testCreateAppointmentValid2359Accepted() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        PatientAppointmentResponse apptResponse = new PatientAppointmentResponse(
                506L,
                futureDate,
                "23:59",
                "Evening emergency consult",
                null,
                "PENDING",
                "Pending confirmation",
                null,
                LocalDateTime.now()
        );

        when(patientPortalService.createAppointmentRequest(eq("alice@dentcare.test"), any(CreateAppointmentRequest.class)))
                .thenReturn(apptResponse);

        String payload = """
                {
                    "appointmentDate": "%s",
                    "preferredTime": "23:59",
                    "reason": "Evening emergency consult"
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.preferredTime", is("23:59")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/appointments returns 200 OK with patient's appointments")
    void testGetPatientAppointmentsSuccess() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(5);
        PatientAppointmentResponse appt = new PatientAppointmentResponse(
                502L,
                futureDate,
                "14:00",
                "Dental cleaning",
                null,
                "PENDING",
                "Pending confirmation",
                null,
                LocalDateTime.now()
        );

        when(patientPortalService.getPatientAppointments(eq("alice@dentcare.test")))
                .thenReturn(List.of(appt));

        mockMvc.perform(get("/api/patient/me/appointments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(502)))
                .andExpect(jsonPath("$[0].reason", is("Dental cleaning")))
                .andExpect(jsonPath("$[0].status", is("PENDING")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/appointments/{id} returns 403 when appointment belongs to another patient")
    void testGetPatientAppointmentCrossPatientForbidden() throws Exception {
        when(patientPortalService.getPatientAppointmentById(eq("alice@dentcare.test"), eq(888L)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: appointment does not belong to the authenticated patient"));

        mockMvc.perform(get("/api/patient/me/appointments/888"))
                .andExpect(status().isForbidden());
    }
}
