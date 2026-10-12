package com.dentcare.patient.controller;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientInvoiceDetailResponse;
import com.dentcare.patient.dto.PatientInvoiceSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.dto.PatientReceiptResponse;
import com.dentcare.patient.exception.PatientExceptionHandler;
import com.dentcare.patient.service.PatientPortalService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

        org.mockito.ArgumentCaptor<CreateAppointmentRequest> captor = org.mockito.ArgumentCaptor.forClass(CreateAppointmentRequest.class);
        org.mockito.Mockito.verify(patientPortalService).createAppointmentRequest(eq("alice@dentcare.test"), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().smsConsent()).isNull();
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with explicit smsConsent true binds field correctly")
    void testCreateAppointmentWithExplicitSmsConsentTrue() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        PatientAppointmentResponse apptResponse = new PatientAppointmentResponse(
                502L,
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
                    "notes": "Morning please",
                    "smsConsent": true
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(502)))
                .andExpect(jsonPath("$.status", is("PENDING")));

        org.mockito.ArgumentCaptor<CreateAppointmentRequest> captor = org.mockito.ArgumentCaptor.forClass(CreateAppointmentRequest.class);
        org.mockito.Mockito.verify(patientPortalService).createAppointmentRequest(eq("alice@dentcare.test"), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().smsConsent()).isTrue();
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/appointments with explicit smsConsent false binds field correctly")
    void testCreateAppointmentWithExplicitSmsConsentFalse() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(3);
        PatientAppointmentResponse apptResponse = new PatientAppointmentResponse(
                503L,
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
                    "notes": "Morning please",
                    "smsConsent": false
                }
                """.formatted(futureDate);

        mockMvc.perform(post("/api/patient/me/appointments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(503)))
                .andExpect(jsonPath("$.status", is("PENDING")));

        org.mockito.ArgumentCaptor<CreateAppointmentRequest> captor = org.mockito.ArgumentCaptor.forClass(CreateAppointmentRequest.class);
        org.mockito.Mockito.verify(patientPortalService).createAppointmentRequest(eq("alice@dentcare.test"), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().smsConsent()).isFalse();
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

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel returns 200 OK with cancelled appointment")
    void testCancelAppointmentSuccess() throws Exception {
        PatientAppointmentResponse appt = new PatientAppointmentResponse(
                701L,
                LocalDate.now().plusDays(3),
                "10:00",
                "Consultation",
                null,
                "CANCELLED",
                "Cancelled",
                null,
                LocalDateTime.now()
        );

        when(patientPortalService.cancelAppointmentRequest(eq("alice@dentcare.test"), eq(701L)))
                .thenReturn(appt);

        mockMvc.perform(patch("/api/patient/me/appointments/701/cancel")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(701)))
                .andExpect(jsonPath("$.status", is("CANCELLED")))
                .andExpect(jsonPath("$.statusDescription", is("Cancelled")));
    }

    @Test
    @WithAnonymousUser
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel by anonymous user is rejected (401 Unauthorized)")
    void testCancelAppointmentAnonymousRejected() throws Exception {
        mockMvc.perform(patch("/api/patient/me/appointments/701/cancel")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR", username = "admin@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel by ADMINISTRATOR is rejected (403 Forbidden)")
    void testCancelAppointmentStaffAdminForbidden() throws Exception {
        mockMvc.perform(patch("/api/patient/me/appointments/701/cancel")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "RECEPTIONIST", username = "receptionist@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel by RECEPTIONIST is rejected (403 Forbidden)")
    void testCancelAppointmentStaffReceptionistForbidden() throws Exception {
        mockMvc.perform(patch("/api/patient/me/appointments/701/cancel")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DENTIST", username = "dentist@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel by DENTIST is rejected (403 Forbidden)")
    void testCancelAppointmentStaffDentistForbidden() throws Exception {
        mockMvc.perform(patch("/api/patient/me/appointments/701/cancel")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel returns 403 Forbidden when appointment belongs to another patient")
    void testCancelAppointmentCrossPatientForbidden() throws Exception {
        when(patientPortalService.cancelAppointmentRequest(eq("alice@dentcare.test"), eq(888L)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: appointment does not belong to the authenticated patient"));

        mockMvc.perform(patch("/api/patient/me/appointments/888/cancel")
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel returns 404 Not Found when appointment does not exist")
    void testCancelAppointmentNotFound() throws Exception {
        when(patientPortalService.cancelAppointmentRequest(eq("alice@dentcare.test"), eq(9999L)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        mockMvc.perform(patch("/api/patient/me/appointments/9999/cancel")
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("PATCH /api/patient/me/appointments/{id}/cancel returns 400 Bad Request when appointment is not in PENDING state")
    void testCancelAppointmentInvalidStateBadRequest() throws Exception {
        when(patientPortalService.cancelAppointmentRequest(eq("alice@dentcare.test"), eq(702L)))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending appointment requests can be cancelled"));

        mockMvc.perform(patch("/api/patient/me/appointments/702/cancel")
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/invoices returns 200 OK with patient's invoices")
    void testGetPatientInvoicesSuccess() throws Exception {
        PatientInvoiceSummaryResponse inv = new PatientInvoiceSummaryResponse(
                501L,
                "INV-2026-0001",
                LocalDate.of(2026, 9, 20),
                new BigDecimal("150.00"),
                new BigDecimal("50.00"),
                new BigDecimal("100.00"),
                "PARTIALLY_PAID"
        );

        when(patientPortalService.getPatientInvoices(eq("alice@dentcare.test")))
                .thenReturn(List.of(inv));

        mockMvc.perform(get("/api/patient/me/invoices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(501)))
                .andExpect(jsonPath("$[0].invoiceNumber", is("INV-2026-0001")))
                .andExpect(jsonPath("$[0].totalAmount", is(150.00)))
                .andExpect(jsonPath("$[0].paidAmount", is(50.00)))
                .andExpect(jsonPath("$[0].balanceAmount", is(100.00)))
                .andExpect(jsonPath("$[0].status", is("PARTIALLY_PAID")));
    }

    @Test
    @WithMockUser(roles = "RECEPTIONIST", username = "staff@dentcare.test")
    @DisplayName("GET /api/patient/me/invoices returns 403 Forbidden for staff role")
    void testGetPatientInvoicesForbiddenForStaffRole() throws Exception {
        mockMvc.perform(get("/api/patient/me/invoices"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithAnonymousUser
    @DisplayName("GET /api/patient/me/invoices returns 401 Unauthorized for anonymous user")
    void testGetPatientInvoicesUnauthorizedForAnonymous() throws Exception {
        mockMvc.perform(get("/api/patient/me/invoices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/invoices/{id} returns 200 OK with invoice details")
    void testGetPatientInvoiceByIdSuccess() throws Exception {
        PatientInvoiceDetailResponse.PatientInvoiceItemDetail item =
                new PatientInvoiceDetailResponse.PatientInvoiceItemDetail(
                        601L,
                        null,
                        "Dental Cleaning",
                        1,
                        new BigDecimal("150.00"),
                        new BigDecimal("150.00")
                );

        PatientInvoiceDetailResponse.PatientPaymentDetail payment =
                new PatientInvoiceDetailResponse.PatientPaymentDetail(
                        701L,
                        "PAY-2026-0001",
                        new BigDecimal("50.00"),
                        "CARD",
                        "AUTH-123",
                        LocalDateTime.of(2026, 9, 20, 10, 30),
                        "RECORDED"
                );

        PatientInvoiceDetailResponse detail = new PatientInvoiceDetailResponse(
                501L,
                "INV-2026-0001",
                LocalDate.of(2026, 9, 20),
                new BigDecimal("150.00"),
                BigDecimal.ZERO,
                new BigDecimal("150.00"),
                new BigDecimal("50.00"),
                new BigDecimal("100.00"),
                "PARTIALLY_PAID",
                "Follow-up scheduled",
                null,
                List.of(item),
                List.of(payment)
        );

        when(patientPortalService.getPatientInvoiceById(eq("alice@dentcare.test"), eq(501L)))
                .thenReturn(detail);

        mockMvc.perform(get("/api/patient/me/invoices/501"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(501)))
                .andExpect(jsonPath("$.invoiceNumber", is("INV-2026-0001")))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].description", is("Dental Cleaning")))
                .andExpect(jsonPath("$.payments", hasSize(1)))
                .andExpect(jsonPath("$.payments[0].paymentNumber", is("PAY-2026-0001")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/invoices/{id} returns 404 Not Found when invoice missing")
    void testGetPatientInvoiceByIdNotFound() throws Exception {
        when(patientPortalService.getPatientInvoiceById(eq("alice@dentcare.test"), eq(9999L)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        mockMvc.perform(get("/api/patient/me/invoices/9999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/invoices/{id} returns 403 Forbidden when accessing another patient's invoice")
    void testGetPatientInvoiceByIdCrossPatientForbidden() throws Exception {
        when(patientPortalService.getPatientInvoiceById(eq("alice@dentcare.test"), eq(888L)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: invoice does not belong to the authenticated patient"));

        mockMvc.perform(get("/api/patient/me/invoices/888"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/payments/{paymentId}/receipt returns 200 OK with receipt details")
    void testGetPatientReceiptSuccess() throws Exception {
        PatientReceiptResponse receipt = new PatientReceiptResponse(
                701L,
                "PAY-2026-0001",
                501L,
                "INV-2026-0001",
                new BigDecimal("50.00"),
                "CARD",
                "AUTH-123",
                LocalDateTime.of(2026, 9, 20, 10, 30),
                new BigDecimal("150.00"),
                new BigDecimal("100.00"),
                "RECORDED"
        );

        when(patientPortalService.getPatientReceipt(eq("alice@dentcare.test"), eq(701L)))
                .thenReturn(receipt);

        mockMvc.perform(get("/api/patient/me/payments/701/receipt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId", is(701)))
                .andExpect(jsonPath("$.paymentNumber", is("PAY-2026-0001")))
                .andExpect(jsonPath("$.invoiceId", is(501)))
                .andExpect(jsonPath("$.invoiceNumber", is("INV-2026-0001")))
                .andExpect(jsonPath("$.paymentAmount", is(50.00)))
                .andExpect(jsonPath("$.paymentMethod", is("CARD")))
                .andExpect(jsonPath("$.paymentReference", is("AUTH-123")))
                .andExpect(jsonPath("$.remainingBalance", is(100.00)))
                .andExpect(jsonPath("$.status", is("RECORDED")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/payments/{paymentId}/receipt returns 404 Not Found when payment missing")
    void testGetPatientReceiptNotFound() throws Exception {
        when(patientPortalService.getPatientReceipt(eq("alice@dentcare.test"), eq(9999L)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        mockMvc.perform(get("/api/patient/me/payments/9999/receipt"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("GET /api/patient/me/payments/{paymentId}/receipt returns 403 Forbidden when receipt belongs to another patient")
    void testGetPatientReceiptCrossPatientForbidden() throws Exception {
        when(patientPortalService.getPatientReceipt(eq("alice@dentcare.test"), eq(888L)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: payment receipt does not belong to the authenticated patient"));

        mockMvc.perform(get("/api/patient/me/payments/888/receipt"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Patient Self-Service: Phone Update Controller Tests
    // =========================================================================

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("PATCH /api/patient/me/profile with valid phone returns 200 OK with safe updated profile")
    void testUpdateProfileSuccess() throws Exception {
        com.dentcare.patient.dto.PatientProfileResponse response =
                new com.dentcare.patient.dto.PatientProfileResponse(
                        101L,
                        "alice@dentcare.test",
                        "Alice",
                        "Smith",
                        "+1 555-9876",
                        "PATIENT"
                );

        when(patientPortalService.updatePatientProfile(eq("alice@dentcare.test"), any(com.dentcare.patient.dto.UpdatePatientProfileRequest.class)))
                .thenReturn(response);

        mockMvc.perform(patch("/api/patient/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\": \"+1 555-9876\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.email", is("alice@dentcare.test")))
                .andExpect(jsonPath("$.firstName", is("Alice")))
                .andExpect(jsonPath("$.lastName", is("Smith")))
                .andExpect(jsonPath("$.phone", is("+1 555-9876")))
                .andExpect(jsonPath("$.role", is("PATIENT")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("PATCH /api/patient/me/profile with phone exceeding 25 chars returns 400 Bad Request")
    void testUpdateProfilePhoneTooLongReturns400() throws Exception {
        mockMvc.perform(patch("/api/patient/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\": \"12345678901234567890123456\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithAnonymousUser
    @DisplayName("PATCH /api/patient/me/profile by anonymous user returns 401 Unauthorized")
    void testUpdateProfileAnonymousReturns401() throws Exception {
        mockMvc.perform(patch("/api/patient/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\": \"+1 555-0100\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMINISTRATOR", username = "admin@dentcare.test")
    @DisplayName("PATCH /api/patient/me/profile by staff role returns 403 Forbidden")
    void testUpdateProfileStaffReturns403() throws Exception {
        mockMvc.perform(patch("/api/patient/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\": \"+1 555-0100\"}"))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Patient Self-Service: Password Change Controller Tests
    // =========================================================================

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/change-password with valid credentials returns 200 OK")
    void testChangePasswordSuccess() throws Exception {
        mockMvc.perform(post("/api/patient/me/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"CurrentPass123\", \"newPassword\": \"NewSecurePass456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", is("Password changed successfully.")));
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/change-password with wrong current password returns 400 Bad Request")
    void testChangePasswordWrongCurrentPasswordReturns400() throws Exception {
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect"))
                .when(patientPortalService).changePatientPassword(eq("alice@dentcare.test"), any(com.dentcare.patient.dto.ChangePasswordRequest.class));

        mockMvc.perform(post("/api/patient/me/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"WrongPass123\", \"newPassword\": \"NewSecurePass456\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/change-password with short new password returns 400 Bad Request")
    void testChangePasswordTooShortReturns400() throws Exception {
        mockMvc.perform(post("/api/patient/me/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"CurrentPass123\", \"newPassword\": \"Short1\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "PATIENT", username = "alice@dentcare.test")
    @DisplayName("POST /api/patient/me/change-password with missing current password returns 400 Bad Request")
    void testChangePasswordMissingCurrentReturns400() throws Exception {
        mockMvc.perform(post("/api/patient/me/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"\", \"newPassword\": \"NewSecurePass456\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithAnonymousUser
    @DisplayName("POST /api/patient/me/change-password by anonymous user returns 401 Unauthorized")
    void testChangePasswordAnonymousReturns401() throws Exception {
        mockMvc.perform(post("/api/patient/me/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"CurrentPass123\", \"newPassword\": \"NewSecurePass456\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "DENTIST", username = "dentist@dentcare.test")
    @DisplayName("POST /api/patient/me/change-password by staff role returns 403 Forbidden")
    void testChangePasswordStaffReturns403() throws Exception {
        mockMvc.perform(post("/api/patient/me/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"CurrentPass123\", \"newPassword\": \"NewSecurePass456\"}"))
                .andExpect(status().isForbidden());
    }
}
