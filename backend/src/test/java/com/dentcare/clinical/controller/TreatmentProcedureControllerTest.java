package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.AddTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CancelTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CompleteTreatmentProcedureRequest;
import com.dentcare.clinical.dto.TreatmentProcedureResponse;
import com.dentcare.clinical.dto.UpdateTreatmentProcedureRequest;
import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.exception.ClinicalExceptionHandler;
import com.dentcare.clinical.exception.InvalidToothNumberException;
import com.dentcare.clinical.exception.InvalidTreatmentPlanStateException;
import com.dentcare.clinical.exception.InvalidTreatmentProcedureStateException;
import com.dentcare.clinical.exception.TreatmentPlanNotFoundException;
import com.dentcare.clinical.exception.TreatmentProcedureNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.service.TreatmentProcedureService;
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

class TreatmentProcedureControllerTest {

    private MockMvc mockMvc;
    private TreatmentProcedureService treatmentProcedureService;
    private ObjectMapper objectMapper;

    private final TreatmentProcedureResponse sampleResponse = new TreatmentProcedureResponse(
            101L,
            1L,
            16,
            "Composite Restoration - Occlusal",
            "D2391",
            1,
            ProcedureStatus.PLANNED,
            BigDecimal.valueOf(150.00),
            null,
            null,
            null,
            null,
            "Deep cavity excavation needed",
            null,
            LocalDateTime.of(2026, 9, 13, 10, 30),
            LocalDateTime.of(2026, 9, 13, 10, 30)
    );

    @BeforeEach
    void setUp() {
        treatmentProcedureService = Mockito.mock(TreatmentProcedureService.class);
        TreatmentProcedureController controller = new TreatmentProcedureController(treatmentProcedureService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ClinicalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{planId}/procedures with valid payload returns 201 Created and Location header")
    void addTreatmentProcedure_validRequest_returns201() throws Exception {
        AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                16,
                "Composite Restoration - Occlusal",
                "D2391",
                1,
                BigDecimal.valueOf(150.00),
                "Deep cavity excavation needed"
        );

        when(treatmentProcedureService.addTreatmentProcedure(eq(1L), any(AddTreatmentProcedureRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/clinical/treatment-plans/1/procedures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/clinical/treatment-procedures/101")))
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.treatmentPlanId", is(1)))
                .andExpect(jsonPath("$.toothNumber", is(16)))
                .andExpect(jsonPath("$.procedureName", is("Composite Restoration - Occlusal")))
                .andExpect(jsonPath("$.status", is("PLANNED")))
                .andExpect(jsonPath("$.estimatedCost", is(150.00)));

        verify(treatmentProcedureService).addTreatmentProcedure(eq(1L), any(AddTreatmentProcedureRequest.class));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{planId}/procedures with missing procedureName returns 400 Bad Request")
    void addTreatmentProcedure_missingProcedureName_returns400() throws Exception {
        AddTreatmentProcedureRequest invalidRequest = new AddTreatmentProcedureRequest(
                16,
                "",
                "D2391",
                1,
                BigDecimal.valueOf(150.00),
                null
        );

        mockMvc.perform(post("/api/clinical/treatment-plans/1/procedures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("procedureName")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{planId}/procedures with invalid tooth number returns 400 Bad Request")
    void addTreatmentProcedure_invalidToothNumber_returns400() throws Exception {
        AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                99,
                "Composite Restoration",
                "D2391",
                1,
                BigDecimal.valueOf(150.00),
                null
        );

        when(treatmentProcedureService.addTreatmentProcedure(eq(1L), any(AddTreatmentProcedureRequest.class)))
                .thenThrow(new InvalidToothNumberException("Invalid FDI tooth number: 99"));

        mockMvc.perform(post("/api/clinical/treatment-plans/1/procedures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Invalid FDI tooth number: 99")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{planId}/procedures when plan not found returns 404 Not Found")
    void addTreatmentProcedure_planNotFound_returns404() throws Exception {
        AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                16,
                "Composite Restoration",
                "D2391",
                1,
                BigDecimal.valueOf(150.00),
                null
        );

        when(treatmentProcedureService.addTreatmentProcedure(eq(999L), any(AddTreatmentProcedureRequest.class)))
                .thenThrow(new TreatmentPlanNotFoundException(999L));

        mockMvc.perform(post("/api/clinical/treatment-plans/999/procedures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-plans/{planId}/procedures when plan in invalid status returns 409 Conflict")
    void addTreatmentProcedure_invalidPlanState_returns409() throws Exception {
        AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                16,
                "Composite Restoration",
                "D2391",
                1,
                BigDecimal.valueOf(150.00),
                null
        );

        when(treatmentProcedureService.addTreatmentProcedure(eq(1L), any(AddTreatmentProcedureRequest.class)))
                .thenThrow(new InvalidTreatmentPlanStateException("Cannot add procedures to completed treatment plan"));

        mockMvc.perform(post("/api/clinical/treatment-plans/1/procedures")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("Cannot add procedures")));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans/{planId}/procedures without toothNumber returns 200 OK with list")
    void getProceduresByPlanId_withoutToothNumber_returns200() throws Exception {
        when(treatmentProcedureService.getProceduresByTreatmentPlanId(1L))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/treatment-plans/1/procedures"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(101)))
                .andExpect(jsonPath("$[0].treatmentPlanId", is(1)))
                .andExpect(jsonPath("$[0].procedureName", is("Composite Restoration - Occlusal")));

        verify(treatmentProcedureService).getProceduresByTreatmentPlanId(1L);
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans/{planId}/procedures with toothNumber returns 200 OK with filtered list")
    void getProceduresByPlanId_withToothNumber_returns200() throws Exception {
        when(treatmentProcedureService.getProceduresByTooth(1L, 16))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/treatment-plans/1/procedures").param("toothNumber", "16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(101)))
                .andExpect(jsonPath("$[0].toothNumber", is(16)));

        verify(treatmentProcedureService).getProceduresByTooth(1L, 16);
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-plans/{planId}/procedures when plan not found returns 404 Not Found")
    void getProceduresByPlanId_planNotFound_returns404() throws Exception {
        when(treatmentProcedureService.getProceduresByTreatmentPlanId(999L))
                .thenThrow(new TreatmentPlanNotFoundException(999L));

        mockMvc.perform(get("/api/clinical/treatment-plans/999/procedures"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-procedures/{id} returns 200 OK for existing procedure")
    void getTreatmentProcedureById_found_returns200() throws Exception {
        when(treatmentProcedureService.getTreatmentProcedureById(101L))
                .thenReturn(sampleResponse);

        mockMvc.perform(get("/api/clinical/treatment-procedures/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.procedureName", is("Composite Restoration - Occlusal")))
                .andExpect(jsonPath("$.status", is("PLANNED")));
    }

    @Test
    @DisplayName("GET /api/clinical/treatment-procedures/{id} returns 404 Not Found for nonexistent procedure")
    void getTreatmentProcedureById_notFound_returns404() throws Exception {
        when(treatmentProcedureService.getTreatmentProcedureById(999L))
                .thenThrow(new TreatmentProcedureNotFoundException(999L));

        mockMvc.perform(get("/api/clinical/treatment-procedures/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("PUT /api/clinical/treatment-procedures/{id} with valid payload returns 200 OK")
    void updateTreatmentProcedure_valid_returns200() throws Exception {
        UpdateTreatmentProcedureRequest request = new UpdateTreatmentProcedureRequest(
                16,
                "Composite Restoration - MOD",
                "D2393",
                1,
                BigDecimal.valueOf(220.00),
                "Extended to mesial and distal surfaces"
        );

        TreatmentProcedureResponse updatedResponse = new TreatmentProcedureResponse(
                101L,
                1L,
                16,
                "Composite Restoration - MOD",
                "D2393",
                1,
                ProcedureStatus.PLANNED,
                BigDecimal.valueOf(220.00),
                null,
                null,
                null,
                null,
                "Extended to mesial and distal surfaces",
                null,
                LocalDateTime.of(2026, 9, 13, 10, 30),
                LocalDateTime.of(2026, 9, 13, 10, 45)
        );

        when(treatmentProcedureService.updateTreatmentProcedure(eq(101L), any(UpdateTreatmentProcedureRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/clinical/treatment-procedures/101")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.procedureName", is("Composite Restoration - MOD")))
                .andExpect(jsonPath("$.estimatedCost", is(220.00)));
    }

    @Test
    @DisplayName("PUT /api/clinical/treatment-procedures/{id} in completed status returns 409 Conflict")
    void updateTreatmentProcedure_invalidState_returns409() throws Exception {
        UpdateTreatmentProcedureRequest request = new UpdateTreatmentProcedureRequest(
                16,
                "Composite Restoration",
                "D2391",
                1,
                BigDecimal.valueOf(150.00),
                null
        );

        when(treatmentProcedureService.updateTreatmentProcedure(eq(101L), any(UpdateTreatmentProcedureRequest.class)))
                .thenThrow(new InvalidTreatmentProcedureStateException("Cannot modify procedure in status: COMPLETED"));

        mockMvc.perform(put("/api/clinical/treatment-procedures/101")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("COMPLETED")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/start without dentistId returns 200 OK")
    void startTreatmentProcedure_withoutDentistId_returns200() throws Exception {
        TreatmentProcedureResponse inProgressResponse = new TreatmentProcedureResponse(
                101L,
                1L,
                16,
                "Composite Restoration - Occlusal",
                "D2391",
                1,
                ProcedureStatus.IN_PROGRESS,
                BigDecimal.valueOf(150.00),
                null,
                null,
                null,
                null,
                "Deep cavity excavation needed",
                null,
                LocalDateTime.of(2026, 9, 13, 10, 30),
                LocalDateTime.of(2026, 9, 13, 11, 0)
        );

        when(treatmentProcedureService.startTreatmentProcedure(101L)).thenReturn(inProgressResponse);

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));

        verify(treatmentProcedureService).startTreatmentProcedure(101L);
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/start with dentistId returns 200 OK")
    void startTreatmentProcedure_withDentistId_returns200() throws Exception {
        TreatmentProcedureResponse inProgressResponse = new TreatmentProcedureResponse(
                101L,
                1L,
                16,
                "Composite Restoration - Occlusal",
                "D2391",
                1,
                ProcedureStatus.IN_PROGRESS,
                BigDecimal.valueOf(150.00),
                null,
                null,
                20L,
                null,
                "Deep cavity excavation needed",
                null,
                LocalDateTime.of(2026, 9, 13, 10, 30),
                LocalDateTime.of(2026, 9, 13, 11, 0)
        );

        when(treatmentProcedureService.startTreatmentProcedure(101L)).thenReturn(inProgressResponse);

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/start").param("dentistId", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));

        verify(treatmentProcedureService).startTreatmentProcedure(101L);
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/start when plan not approved returns 409 Conflict")
    void startTreatmentProcedure_invalidState_returns409() throws Exception {
        when(treatmentProcedureService.startTreatmentProcedure(101L))
                .thenThrow(new InvalidTreatmentProcedureStateException("Cannot start procedure under PROPOSED plan"));

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/start"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("PROPOSED plan")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/complete with valid payload returns 200 OK")
    void completeTreatmentProcedure_valid_returns200() throws Exception {
        CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                20L,
                25L,
                LocalDate.of(2026, 9, 13),
                BigDecimal.valueOf(150.00),
                "Restoration completed with no complications"
        );

        TreatmentProcedureResponse completedResponse = new TreatmentProcedureResponse(
                101L,
                1L,
                16,
                "Composite Restoration - Occlusal",
                "D2391",
                1,
                ProcedureStatus.COMPLETED,
                BigDecimal.valueOf(150.00),
                BigDecimal.valueOf(150.00),
                LocalDate.of(2026, 9, 13),
                20L,
                25L,
                "Restoration completed with no complications",
                null,
                LocalDateTime.of(2026, 9, 13, 10, 30),
                LocalDateTime.of(2026, 9, 13, 11, 30)
        );

        when(treatmentProcedureService.completeTreatmentProcedure(eq(101L), any(CompleteTreatmentProcedureRequest.class)))
                .thenReturn(completedResponse);

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.performedByDentistId", is(20)))
                .andExpect(jsonPath("$.actualCost", is(150.00)));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/complete without performing dentist in body succeeds")
    void completeTreatmentProcedure_withoutDentistInBody_succeeds() throws Exception {
        CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                25L,
                LocalDate.of(2026, 9, 13),
                BigDecimal.valueOf(150.00),
                "Restoration completed"
        );

        TreatmentProcedureResponse completedResponse = new TreatmentProcedureResponse(
                101L,
                1L,
                16,
                "Composite Restoration - Occlusal",
                "D2391",
                1,
                ProcedureStatus.COMPLETED,
                BigDecimal.valueOf(150.00),
                BigDecimal.valueOf(150.00),
                LocalDate.of(2026, 9, 13),
                20L,
                25L,
                "Restoration completed",
                null,
                LocalDateTime.of(2026, 9, 13, 10, 30),
                LocalDateTime.of(2026, 9, 13, 11, 30)
        );

        when(treatmentProcedureService.completeTreatmentProcedure(eq(101L), any(CompleteTreatmentProcedureRequest.class)))
                .thenReturn(completedResponse);

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/complete by non-dentist returns 403 Forbidden")
    void completeTreatmentProcedure_unauthorizedDentist_returns403() throws Exception {
        CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                30L,
                null,
                LocalDate.of(2026, 9, 13),
                BigDecimal.valueOf(150.00),
                null
        );

        when(treatmentProcedureService.completeTreatmentProcedure(eq(101L), any(CompleteTreatmentProcedureRequest.class)))
                .thenThrow(new UnauthorizedClinicalOperationException("User with id 30 is not an active dentist"));

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("not an active dentist")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/cancel with valid payload returns 200 OK")
    void cancelTreatmentProcedure_valid_returns200() throws Exception {
        CancelTreatmentProcedureRequest request = new CancelTreatmentProcedureRequest(
                20L,
                "Patient declined restoration on tooth 16"
        );

        TreatmentProcedureResponse cancelledResponse = new TreatmentProcedureResponse(
                101L,
                1L,
                16,
                "Composite Restoration - Occlusal",
                "D2391",
                1,
                ProcedureStatus.CANCELLED,
                BigDecimal.valueOf(150.00),
                null,
                null,
                null,
                null,
                null,
                "Patient declined restoration on tooth 16",
                LocalDateTime.of(2026, 9, 13, 10, 30),
                LocalDateTime.of(2026, 9, 13, 11, 15)
        );

        when(treatmentProcedureService.cancelTreatmentProcedure(eq(101L), any(CancelTreatmentProcedureRequest.class)))
                .thenReturn(cancelledResponse);

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(101)))
                .andExpect(jsonPath("$.status", is("CANCELLED")))
                .andExpect(jsonPath("$.cancellationReason", is("Patient declined restoration on tooth 16")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/cancel with blank reason returns 400 Bad Request")
    void cancelTreatmentProcedure_missingReason_returns400() throws Exception {
        CancelTreatmentProcedureRequest invalidRequest = new CancelTreatmentProcedureRequest(20L, "");

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("cancellationReason")));
    }

    @Test
    @DisplayName("POST /api/clinical/treatment-procedures/{id}/cancel by non-dentist returns 403 Forbidden")
    void cancelTreatmentProcedure_unauthorizedDentist_returns403() throws Exception {
        CancelTreatmentProcedureRequest request = new CancelTreatmentProcedureRequest(30L, "Cancelled by staff");

        when(treatmentProcedureService.cancelTreatmentProcedure(eq(101L), any(CancelTreatmentProcedureRequest.class)))
                .thenThrow(new UnauthorizedClinicalOperationException("User with id 30 is not an active dentist"));

        mockMvc.perform(post("/api/clinical/treatment-procedures/101/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("not an active dentist")));
    }
}
