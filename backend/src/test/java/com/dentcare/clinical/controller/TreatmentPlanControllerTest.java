package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.ApproveTreatmentPlanRequest;
import com.dentcare.clinical.dto.CancelTreatmentPlanRequest;
import com.dentcare.clinical.dto.CreateTreatmentPlanRequest;
import com.dentcare.clinical.dto.FollowUpRequest;
import com.dentcare.clinical.dto.TreatmentPlanResponse;
import com.dentcare.clinical.dto.UpdateTreatmentPlanRequest;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import com.dentcare.clinical.exception.ClinicalExceptionHandler;
import com.dentcare.clinical.exception.DentistNotFoundException;
import com.dentcare.clinical.exception.InvalidTreatmentPlanStateException;
import com.dentcare.clinical.exception.PatientNotFoundException;
import com.dentcare.clinical.exception.TreatmentPlanNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.service.TreatmentPlanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TreatmentPlanControllerTest {

    private MockMvc mockMvc;
    private TreatmentPlanService treatmentPlanService;
    private ObjectMapper objectMapper;

    private final TreatmentPlanResponse sampleResponse = new TreatmentPlanResponse(
            1L,
            10L,
            20L,
            100L,
            20L,
            "Comprehensive Restorative Plan",
            TreatmentPlanStatus.PROPOSED,
            BigDecimal.valueOf(1500.00),
            BigDecimal.ZERO,
            null,
            null,
            null,
            null,
            "Initial clinical notes",
            LocalDateTime.of(2026, 9, 13, 10, 0),
            LocalDateTime.of(2026, 9, 13, 10, 0),
            0L
    );

    @BeforeEach
    void setUp() {
        treatmentPlanService = Mockito.mock(TreatmentPlanService.class);
        TreatmentPlanController controller = new TreatmentPlanController(treatmentPlanService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ClinicalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans with valid payload returns 201 Created and Location header")
    void createTreatmentPlan_validRequest_returns201() throws Exception {
        CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                BigDecimal.valueOf(1500.00),
                "Initial clinical notes"
        );

        when(treatmentPlanService.createTreatmentPlan(any(CreateTreatmentPlanRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/clinical/treatment-plans/1")))
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.patientId", is(10)))
                .andExpect(jsonPath("$.dentistId", is(20)))
                .andExpect(jsonPath("$.planName", is("Comprehensive Restorative Plan")))
                .andExpect(jsonPath("$.status", is("PROPOSED")))
                .andExpect(jsonPath("$.totalEstimatedCost", is(1500.00)));

        verify(treatmentPlanService).createTreatmentPlan(any(CreateTreatmentPlanRequest.class));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans with missing required fields returns 400 Bad Request")
    void createTreatmentPlan_missingRequiredFields_returns400() throws Exception {
        CreateTreatmentPlanRequest invalidRequest = new CreateTreatmentPlanRequest(
                null,
                null,
                null,
                null,
                "",
                null,
                null
        );

        mockMvc.perform(post("/api/clinical/treatment-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("patientId")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("dentistId")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("createdByUserId")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("planName")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans when patient not found returns 404 Not Found")
    void createTreatmentPlan_patientNotFound_returns404() throws Exception {
        CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                999L,
                20L,
                null,
                20L,
                "Plan for missing patient",
                BigDecimal.valueOf(500.00),
                null
        );

        when(treatmentPlanService.createTreatmentPlan(any(CreateTreatmentPlanRequest.class)))
                .thenThrow(new PatientNotFoundException(999L));

        mockMvc.perform(post("/api/clinical/treatment-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans when dentist not found returns 404 Not Found")
    void createTreatmentPlan_dentistNotFound_returns404() throws Exception {
        CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                10L,
                888L,
                null,
                20L,
                "Plan for missing dentist",
                BigDecimal.valueOf(500.00),
                null
        );

        when(treatmentPlanService.createTreatmentPlan(any(CreateTreatmentPlanRequest.class)))
                .thenThrow(new DentistNotFoundException(888L));

        mockMvc.perform(post("/api/clinical/treatment-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("888")));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans/{id} returns 200 OK for existing treatment plan")
    void getTreatmentPlanById_found_returns200() throws Exception {
        when(treatmentPlanService.getTreatmentPlanById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/clinical/treatment-plans/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.planName", is("Comprehensive Restorative Plan")))
                .andExpect(jsonPath("$.status", is("PROPOSED")));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans/{id} returns 404 Not Found for nonexistent treatment plan")
    void getTreatmentPlanById_notFound_returns404() throws Exception {
        when(treatmentPlanService.getTreatmentPlanById(999L))
                .thenThrow(new TreatmentPlanNotFoundException(999L));

        mockMvc.perform(get("/api/clinical/treatment-plans/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans?patientId={patientId} returns 200 OK with list")
    void getTreatmentPlans_byPatientId_returns200() throws Exception {
        when(treatmentPlanService.getTreatmentPlansByPatientId(10L))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/treatment-plans").param("patientId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].patientId", is(10)));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans?examinationId={examinationId} returns 200 OK with list")
    void getTreatmentPlans_byExaminationId_returns200() throws Exception {
        when(treatmentPlanService.getTreatmentPlansByExaminationId(100L))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/treatment-plans").param("examinationId", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].examinationId", is(100)));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans?dentistId={dentistId} returns 200 OK with list")
    void getTreatmentPlans_byDentistId_returns200() throws Exception {
        when(treatmentPlanService.getTreatmentPlansByDentistId(20L))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/treatment-plans").param("dentistId", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].dentistId", is(20)));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans with no query params returns 400 Bad Request")
    void getTreatmentPlans_noParams_returns400() throws Exception {
        mockMvc.perform(get("/api/clinical/treatment-plans"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/clinical/treatment-plans/{id} with valid payload returns 200 OK")
    void updateTreatmentPlan_valid_returns200() throws Exception {
        UpdateTreatmentPlanRequest request = new UpdateTreatmentPlanRequest(
                "Updated Plan Name",
                BigDecimal.valueOf(1800.00),
                "Updated clinical notes"
        );

        TreatmentPlanResponse updatedResponse = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Updated Plan Name",
                TreatmentPlanStatus.PROPOSED,
                BigDecimal.valueOf(1800.00),
                BigDecimal.ZERO,
                null,
                null,
                null,
                null,
                "Updated clinical notes",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 10, 30),
                1L
        );

        when(treatmentPlanService.updateTreatmentPlan(eq(1L), any(UpdateTreatmentPlanRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/clinical/treatment-plans/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.planName", is("Updated Plan Name")))
                .andExpect(jsonPath("$.totalEstimatedCost", is(1800.00)));
    }

    @Test
    @DisplayName("PUT /api/clinical/treatment-plans/{id} in non-PROPOSED status returns 409 Conflict")
    void updateTreatmentPlan_invalidState_returns409() throws Exception {
        UpdateTreatmentPlanRequest request = new UpdateTreatmentPlanRequest(
                "Updated Plan Name",
                BigDecimal.valueOf(1800.00),
                null
        );

        when(treatmentPlanService.updateTreatmentPlan(eq(1L), any(UpdateTreatmentPlanRequest.class)))
                .thenThrow(new InvalidTreatmentPlanStateException("Treatment plan cannot be modified in status: APPROVED"));

        mockMvc.perform(put("/api/clinical/treatment-plans/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("APPROVED")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/approve by active dentist returns 200 OK")
    void approveTreatmentPlan_validDentist_returns200() throws Exception {
        ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest(20L);

        TreatmentPlanResponse approvedResponse = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                TreatmentPlanStatus.APPROVED,
                BigDecimal.valueOf(1500.00),
                BigDecimal.ZERO,
                20L,
                LocalDateTime.of(2026, 9, 13, 11, 0),
                null,
                null,
                "Initial clinical notes",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 11, 0),
                1L
        );

        when(treatmentPlanService.approveTreatmentPlan(eq(1L), any(ApproveTreatmentPlanRequest.class)))
                .thenReturn(approvedResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("APPROVED")))
                .andExpect(jsonPath("$.approvedByDentistId", is(20)));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/approve by non-dentist returns 403 Forbidden")
    void approveTreatmentPlan_unauthorizedDentist_returns403() throws Exception {
        ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest(30L);

        when(treatmentPlanService.approveTreatmentPlan(eq(1L), any(ApproveTreatmentPlanRequest.class)))
                .thenThrow(new UnauthorizedClinicalOperationException("User with id 30 is not an active dentist"));

        mockMvc.perform(post("/api/clinical/treatment-plans/1/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("not an active dentist")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/approve when not PROPOSED returns 409 Conflict")
    void approveTreatmentPlan_invalidState_returns409() throws Exception {
        ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest(20L);

        when(treatmentPlanService.approveTreatmentPlan(eq(1L), any(ApproveTreatmentPlanRequest.class)))
                .thenThrow(new InvalidTreatmentPlanStateException("Only PROPOSED treatment plans can be approved"));

        mockMvc.perform(post("/api/clinical/treatment-plans/1/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("Only PROPOSED")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/start without dentistId returns 200 OK")
    void startTreatmentPlan_withoutDentistId_returns200() throws Exception {
        TreatmentPlanResponse startedResponse = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                TreatmentPlanStatus.IN_PROGRESS,
                BigDecimal.valueOf(1500.00),
                BigDecimal.ZERO,
                20L,
                LocalDateTime.of(2026, 9, 13, 11, 0),
                null,
                null,
                "Initial clinical notes",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 11, 15),
                2L
        );

        when(treatmentPlanService.startTreatmentPlan(1L)).thenReturn(startedResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));

        verify(treatmentPlanService).startTreatmentPlan(1L);
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/start with dentistId ignored returns 200 OK")
    void startTreatmentPlan_withDentistId_returns200() throws Exception {
        TreatmentPlanResponse startedResponse = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                TreatmentPlanStatus.IN_PROGRESS,
                BigDecimal.valueOf(1500.00),
                BigDecimal.ZERO,
                20L,
                LocalDateTime.of(2026, 9, 13, 11, 0),
                null,
                null,
                "Initial clinical notes",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 11, 15),
                2L
        );

        when(treatmentPlanService.startTreatmentPlan(1L)).thenReturn(startedResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/start").param("dentistId", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));

        verify(treatmentPlanService).startTreatmentPlan(1L);
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/complete without dentistId returns 200 OK")
    void completeTreatmentPlan_withoutDentistId_returns200() throws Exception {
        TreatmentPlanResponse completedResponse = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                TreatmentPlanStatus.COMPLETED,
                BigDecimal.valueOf(1500.00),
                BigDecimal.valueOf(1450.00),
                20L,
                LocalDateTime.of(2026, 9, 13, 11, 0),
                LocalDateTime.of(2026, 9, 13, 12, 0),
                null,
                "Initial clinical notes",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 12, 0),
                3L
        );

        when(treatmentPlanService.completeTreatmentPlan(1L)).thenReturn(completedResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.totalActualCost", is(1450.00)));

        verify(treatmentPlanService).completeTreatmentPlan(1L);
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/complete when procedures incomplete returns 409 Conflict")
    void completeTreatmentPlan_incompleteProcedures_returns409() throws Exception {
        when(treatmentPlanService.completeTreatmentPlan(1L))
                .thenThrow(new InvalidTreatmentPlanStateException("Cannot complete treatment plan: 1 procedures remain active"));

        mockMvc.perform(post("/api/clinical/treatment-plans/1/complete"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("procedures remain active")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/cancel with valid request returns 200 OK")
    void cancelTreatmentPlan_valid_returns200() throws Exception {
        CancelTreatmentPlanRequest request = new CancelTreatmentPlanRequest(20L, "Patient opted for second opinion");

        TreatmentPlanResponse cancelledResponse = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                TreatmentPlanStatus.CANCELLED,
                BigDecimal.valueOf(1500.00),
                BigDecimal.ZERO,
                null,
                null,
                null,
                "Patient opted for second opinion",
                "Initial clinical notes",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 11, 30),
                2L
        );

        when(treatmentPlanService.cancelTreatmentPlan(eq(1L), any(CancelTreatmentPlanRequest.class)))
                .thenReturn(cancelledResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("CANCELLED")))
                .andExpect(jsonPath("$.cancellationReason", is("Patient opted for second opinion")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/cancel with blank reason returns 400 Bad Request")
    void cancelTreatmentPlan_missingReason_returns400() throws Exception {
        CancelTreatmentPlanRequest invalidRequest = new CancelTreatmentPlanRequest(20L, "");

        mockMvc.perform(post("/api/clinical/treatment-plans/1/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("cancellationReason")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/follow-up with valid payload returns 200 OK")
    void setFollowUpDate_valid_returns200() throws Exception {
        FollowUpRequest request = new FollowUpRequest(
                LocalDate.of(2026, 10, 15),
                20L,
                "Check healing of restored area"
        );

        TreatmentPlanResponse responseWithFollowUp = new TreatmentPlanResponse(
                1L,
                10L,
                20L,
                100L,
                20L,
                "Comprehensive Restorative Plan",
                TreatmentPlanStatus.IN_PROGRESS,
                BigDecimal.valueOf(1500.00),
                BigDecimal.ZERO,
                20L,
                LocalDateTime.of(2026, 9, 13, 11, 0),
                null,
                null,
                "Check healing of restored area",
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 11, 45),
                2L
        );

        when(treatmentPlanService.setFollowUpDate(eq(1L), any(FollowUpRequest.class)))
                .thenReturn(responseWithFollowUp);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/follow-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.clinicalNotes", is("Check healing of restored area")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{id}/follow-up with missing fields returns 400 Bad Request")
    void setFollowUpDate_missingFields_returns400() throws Exception {
        FollowUpRequest invalidRequest = new FollowUpRequest(null, null);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/follow-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("followUpDate")));
    }
}
