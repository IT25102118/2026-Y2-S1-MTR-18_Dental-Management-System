package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.AddToothFindingRequest;
import com.dentcare.clinical.dto.ToothFindingResponse;
import com.dentcare.clinical.dto.UpdateToothFindingRequest;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.ClinicalExceptionHandler;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidToothNumberException;
import com.dentcare.clinical.exception.ToothFindingNotFoundException;
import com.dentcare.clinical.service.ToothFindingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
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

class ToothFindingControllerTest {

    private MockMvc mockMvc;
    private ToothFindingService toothFindingService;
    private ObjectMapper objectMapper;

    private final ToothFindingResponse sampleResponse = new ToothFindingResponse(
            10L,
            1L,
            16,
            false,
            "caries",
            "Occlusal pit and fissure caries",
            20L,
            LocalDateTime.of(2026, 9, 13, 10, 15)
    );

    @BeforeEach
    void setUp() {
        toothFindingService = Mockito.mock(ToothFindingService.class);
        ToothFindingController controller = new ToothFindingController(toothFindingService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ClinicalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /api/clinical/examinations/{examinationId}/tooth-findings with valid payload returns 201 Created and Location header")
    void addToothFinding_validRequest_returns201() throws Exception {
        AddToothFindingRequest request = new AddToothFindingRequest(
                16,
                false,
                "caries",
                "Occlusal pit and fissure caries",
                20L
        );

        when(toothFindingService.addToothFinding(eq(1L), any(AddToothFindingRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/clinical/examinations/1/tooth-findings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/clinical/tooth-findings/10")))
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.examinationId", is(1)))
                .andExpect(jsonPath("$.toothNumber", is(16)))
                .andExpect(jsonPath("$.isGeneral", is(false)))
                .andExpect(jsonPath("$.conditionName", is("caries")))
                .andExpect(jsonPath("$.notes", is("Occlusal pit and fissure caries")))
                .andExpect(jsonPath("$.recordedByUserId", is(20)));

        verify(toothFindingService).addToothFinding(eq(1L), any(AddToothFindingRequest.class));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations/{examinationId}/tooth-findings with invalid tooth number returns 400 Bad Request")
    void addToothFinding_invalidToothNumber_returns400() throws Exception {
        AddToothFindingRequest request = new AddToothFindingRequest(
                99,
                false,
                "caries",
                null,
                20L
        );

        when(toothFindingService.addToothFinding(eq(1L), any(AddToothFindingRequest.class)))
                .thenThrow(new InvalidToothNumberException("Invalid FDI tooth number: 99"));

        mockMvc.perform(post("/api/clinical/examinations/1/tooth-findings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Invalid FDI tooth number: 99")));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations/{examinationId}/tooth-findings when examination not found returns 404 Not Found")
    void addToothFinding_examinationNotFound_returns404() throws Exception {
        AddToothFindingRequest request = new AddToothFindingRequest(
                16,
                false,
                "caries",
                null,
                20L
        );

        when(toothFindingService.addToothFinding(eq(999L), any(AddToothFindingRequest.class)))
                .thenThrow(new ClinicalExaminationNotFoundException(999L));

        mockMvc.perform(post("/api/clinical/examinations/999/tooth-findings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("GET /api/clinical/examinations/{examinationId}/tooth-findings returns 200 OK with findings list")
    void getToothFindingsByExaminationId_found_returns200() throws Exception {
        when(toothFindingService.getToothFindingsByExaminationId(1L))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/examinations/1/tooth-findings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(10)))
                .andExpect(jsonPath("$[0].examinationId", is(1)))
                .andExpect(jsonPath("$[0].toothNumber", is(16)))
                .andExpect(jsonPath("$[0].conditionName", is("caries")));
    }

    @Test
    @DisplayName("GET /api/clinical/examinations/{examinationId}/tooth-findings when examination missing returns 404 Not Found")
    void getToothFindingsByExaminationId_examinationMissing_returns404() throws Exception {
        when(toothFindingService.getToothFindingsByExaminationId(999L))
                .thenThrow(new ClinicalExaminationNotFoundException(999L));

        mockMvc.perform(get("/api/clinical/examinations/999/tooth-findings"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("GET /api/clinical/tooth-findings/{id} returns 200 OK for existing finding")
    void getToothFindingById_found_returns200() throws Exception {
        when(toothFindingService.getToothFindingById(10L))
                .thenReturn(sampleResponse);

        mockMvc.perform(get("/api/clinical/tooth-findings/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.examinationId", is(1)))
                .andExpect(jsonPath("$.toothNumber", is(16)))
                .andExpect(jsonPath("$.conditionName", is("caries")));
    }

    @Test
    @DisplayName("GET /api/clinical/tooth-findings/{id} returns 404 Not Found for nonexistent finding")
    void getToothFindingById_notFound_returns404() throws Exception {
        when(toothFindingService.getToothFindingById(999L))
                .thenThrow(new ToothFindingNotFoundException(999L));

        mockMvc.perform(get("/api/clinical/tooth-findings/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("PUT /api/clinical/tooth-findings/{id} with valid payload returns 200 OK")
    void updateToothFinding_valid_returns200() throws Exception {
        UpdateToothFindingRequest request = new UpdateToothFindingRequest(
                16,
                false,
                "caries",
                "Restoration recommended"
        );

        ToothFindingResponse updatedResponse = new ToothFindingResponse(
                10L,
                1L,
                16,
                false,
                "caries",
                "Restoration recommended",
                20L,
                LocalDateTime.of(2026, 9, 13, 10, 15)
        );

        when(toothFindingService.updateToothFinding(eq(10L), any(UpdateToothFindingRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/clinical/tooth-findings/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.notes", is("Restoration recommended")));
    }

    @Test
    @DisplayName("PUT /api/clinical/tooth-findings/{id} on completed examination returns 409 Conflict")
    void updateToothFinding_invalidExaminationState_returns409() throws Exception {
        UpdateToothFindingRequest request = new UpdateToothFindingRequest(
                16,
                false,
                "caries",
                "Attempt to edit finding"
        );

        when(toothFindingService.updateToothFinding(eq(10L), any(UpdateToothFindingRequest.class)))
                .thenThrow(new InvalidClinicalExaminationStateException("Cannot modify tooth findings for a completed examination"));

        mockMvc.perform(put("/api/clinical/tooth-findings/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("completed examination")));
    }
}
