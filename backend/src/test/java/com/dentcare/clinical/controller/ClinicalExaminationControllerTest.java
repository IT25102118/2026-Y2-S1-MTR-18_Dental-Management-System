package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.ClinicalExaminationResponse;
import com.dentcare.clinical.dto.ConfirmDiagnosisRequest;
import com.dentcare.clinical.dto.CreateClinicalExaminationRequest;
import com.dentcare.clinical.dto.UpdateClinicalExaminationRequest;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.ClinicalExceptionHandler;
import com.dentcare.clinical.exception.DentistNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidDiagnosisConfirmationException;
import com.dentcare.clinical.exception.PatientMismatchException;
import com.dentcare.clinical.exception.PatientNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.service.ClinicalExaminationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
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

class ClinicalExaminationControllerTest {

    private MockMvc mockMvc;
    private ClinicalExaminationService examinationService;
    private ObjectMapper objectMapper;

    private final ClinicalExaminationResponse sampleResponse = new ClinicalExaminationResponse(
            1L,
            10L,
            20L,
            20L,
            100L,
            LocalDate.of(2026, 9, 13),
            "Severe toothache in upper right quadrant",
            "Deep occlusal caries on tooth 16",
            "Reversible pulpitis",
            null,
            false,
            null,
            null,
            null,
            null,
            ExaminationStatus.DRAFT,
            LocalDateTime.of(2026, 9, 13, 10, 0),
            LocalDateTime.of(2026, 9, 13, 10, 0),
            0L
    );

    @BeforeEach
    void setUp() {
        examinationService = Mockito.mock(ClinicalExaminationService.class);
        ClinicalExaminationController controller = new ClinicalExaminationController(examinationService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ClinicalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /api/clinical/examinations with valid payload returns 201 Created and Location header")
    void createExamination_validRequest_returns201() throws Exception {
        CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                10L,
                20L,
                100L,
                20L,
                LocalDate.of(2026, 9, 13),
                "Severe toothache in upper right quadrant",
                "Deep occlusal caries on tooth 16",
                "Reversible pulpitis",
                null,
                null
        );

        when(examinationService.createDraftExamination(any(CreateClinicalExaminationRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/clinical/examinations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/clinical/examinations/1")))
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.patientId", is(10)))
                .andExpect(jsonPath("$.dentistId", is(20)))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.chiefComplaint", is("Severe toothache in upper right quadrant")));

        verify(examinationService).createDraftExamination(any(CreateClinicalExaminationRequest.class));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations with missing required fields returns 400 Bad Request with field errors")
    void createExamination_missingRequiredFields_returns400() throws Exception {
        CreateClinicalExaminationRequest invalidRequest = new CreateClinicalExaminationRequest(
                null,
                null,
                null,
                null,
                null,
                "",
                null,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/clinical/examinations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("patientId")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("dentistId")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("recordedByUserId")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("chiefComplaint")));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations when patient not found returns 404 Not Found")
    void createExamination_patientNotFound_returns404() throws Exception {
        CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                999L,
                20L,
                null,
                20L,
                LocalDate.of(2026, 9, 13),
                "Routine checkup",
                null,
                null,
                null,
                null
        );

        when(examinationService.createDraftExamination(any(CreateClinicalExaminationRequest.class)))
                .thenThrow(new PatientNotFoundException(999L));

        mockMvc.perform(post("/api/clinical/examinations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations when dentist not found returns 404 Not Found")
    void createExamination_dentistNotFound_returns404() throws Exception {
        CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                10L,
                888L,
                null,
                20L,
                LocalDate.of(2026, 9, 13),
                "Routine checkup",
                null,
                null,
                null,
                null
        );

        when(examinationService.createDraftExamination(any(CreateClinicalExaminationRequest.class)))
                .thenThrow(new DentistNotFoundException(888L));

        mockMvc.perform(post("/api/clinical/examinations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("888")));
    }

    @Test
    @DisplayName("GET /api/clinical/examinations/{id} returns 200 OK for existing examination")
    void getExaminationById_found_returns200() throws Exception {
        when(examinationService.getExaminationById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/clinical/examinations/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.patientId", is(10)))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.chiefComplaint", is("Severe toothache in upper right quadrant")));
    }

    @Test
    @DisplayName("GET /api/clinical/examinations/{id} returns 404 Not Found for nonexistent examination")
    void getExaminationById_notFound_returns404() throws Exception {
        when(examinationService.getExaminationById(999L))
                .thenThrow(new ClinicalExaminationNotFoundException(999L));

        mockMvc.perform(get("/api/clinical/examinations/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("GET /api/clinical/examinations?patientId={patientId} returns 200 OK with examination list")
    void getExaminationsByPatientId_found_returns200() throws Exception {
        when(examinationService.getExaminationsByPatientId(10L))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/clinical/examinations").param("patientId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].patientId", is(10)))
                .andExpect(jsonPath("$[0].status", is("DRAFT")));
    }

    @Test
    @DisplayName("GET /api/clinical/examinations?patientId={patientId} returns 403 Forbidden on patient mismatch")
    void getExaminationsByPatientId_patientMismatch_returns403() throws Exception {
        when(examinationService.getExaminationsByPatientId(99L))
                .thenThrow(new PatientMismatchException(1L, 99L));

        mockMvc.perform(get("/api/clinical/examinations").param("patientId", "99"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("does not belong to patient")));
    }

    @Test
    @DisplayName("PUT /api/clinical/examinations/{id} with valid payload updates draft and returns 200 OK")
    void updateDraftExamination_valid_returns200() throws Exception {
        UpdateClinicalExaminationRequest request = new UpdateClinicalExaminationRequest(
                LocalDate.of(2026, 9, 13),
                "Updated complaint: mild sensitivity",
                "Caries excavation planned",
                "Reversible pulpitis confirmed",
                null,
                null
        );

        ClinicalExaminationResponse updatedResponse = new ClinicalExaminationResponse(
                1L,
                10L,
                20L,
                20L,
                100L,
                LocalDate.of(2026, 9, 13),
                "Updated complaint: mild sensitivity",
                "Caries excavation planned",
                "Reversible pulpitis confirmed",
                null,
                false,
                null,
                null,
                null,
                null,
                ExaminationStatus.DRAFT,
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 10, 30),
                1L
        );

        when(examinationService.updateDraftExamination(eq(1L), any(UpdateClinicalExaminationRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/clinical/examinations/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.chiefComplaint", is("Updated complaint: mild sensitivity")))
                .andExpect(jsonPath("$.clinicalObservations", is("Caries excavation planned")));
    }

    @Test
    @DisplayName("PUT /api/clinical/examinations/{id} on completed examination returns 409 Conflict")
    void updateDraftExamination_invalidState_returns409() throws Exception {
        UpdateClinicalExaminationRequest request = new UpdateClinicalExaminationRequest(
                null,
                "Attempt to edit completed exam",
                null,
                null,
                null,
                null
        );

        when(examinationService.updateDraftExamination(eq(1L), any(UpdateClinicalExaminationRequest.class)))
                .thenThrow(new InvalidClinicalExaminationStateException("Cannot update completed examination"));

        mockMvc.perform(put("/api/clinical/examinations/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("Cannot update completed examination")));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations/{id}/confirm-diagnosis by active dentist returns 200 OK")
    void confirmDiagnosis_validDentist_returns200() throws Exception {
        ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest(
                20L,
                "Irreversible pulpitis with periapical periodontitis"
        );

        ClinicalExaminationResponse confirmedResponse = new ClinicalExaminationResponse(
                1L,
                10L,
                20L,
                20L,
                100L,
                LocalDate.of(2026, 9, 13),
                "Severe toothache in upper right quadrant",
                "Deep occlusal caries on tooth 16",
                "Reversible pulpitis",
                "Irreversible pulpitis with periapical periodontitis",
                true,
                20L,
                LocalDateTime.of(2026, 9, 13, 11, 0),
                null,
                null,
                ExaminationStatus.DRAFT,
                LocalDateTime.of(2026, 9, 13, 10, 0),
                LocalDateTime.of(2026, 9, 13, 11, 0),
                1L
        );

        when(examinationService.confirmDiagnosis(eq(1L), any(ConfirmDiagnosisRequest.class)))
                .thenReturn(confirmedResponse);

        mockMvc.perform(post("/api/clinical/examinations/1/confirm-diagnosis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.isDiagnosisConfirmed", is(true)))
                .andExpect(jsonPath("$.confirmedDiagnosis", is("Irreversible pulpitis with periapical periodontitis")))
                .andExpect(jsonPath("$.confirmedByDentistId", is(20)))
                .andExpect(jsonPath("$.diagnosisConfirmedAt", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations/{id}/confirm-diagnosis by non-dentist returns 403 Forbidden")
    void confirmDiagnosis_unauthorizedRole_returns403() throws Exception {
        ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest(
                30L,
                "Irreversible pulpitis"
        );

        when(examinationService.confirmDiagnosis(eq(1L), any(ConfirmDiagnosisRequest.class)))
                .thenThrow(new UnauthorizedClinicalOperationException("User with id 30 is not an active dentist authorized to confirm diagnosis"));

        mockMvc.perform(post("/api/clinical/examinations/1/confirm-diagnosis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")))
                .andExpect(jsonPath("$.message", containsString("not an active dentist authorized")));
    }

    @Test
    @DisplayName("POST /api/clinical/examinations/{id}/confirm-diagnosis when already confirmed returns 409 Conflict")
    void confirmDiagnosis_alreadyConfirmed_returns409() throws Exception {
        ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest(
                20L,
                "New diagnosis overwrite"
        );

        when(examinationService.confirmDiagnosis(eq(1L), any(ConfirmDiagnosisRequest.class)))
                .thenThrow(new InvalidDiagnosisConfirmationException("Diagnosis has already been confirmed and cannot be overwritten"));

        mockMvc.perform(post("/api/clinical/examinations/1/confirm-diagnosis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("already been confirmed")));
    }
}
