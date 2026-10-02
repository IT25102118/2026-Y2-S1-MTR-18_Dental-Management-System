package com.dentcare.patient.controller;

import com.dentcare.patient.dto.CreatePatientRequest;
import com.dentcare.patient.dto.PatientResponse;
import com.dentcare.patient.dto.PatientSummaryResponse;
import com.dentcare.patient.dto.UpdatePatientRequest;
import com.dentcare.patient.dto.UpdatePatientStatusRequest;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.exception.DuplicatePatientCodeException;
import com.dentcare.patient.exception.PatientExceptionHandler;
import com.dentcare.patient.exception.PatientNotFoundException;
import com.dentcare.patient.service.PatientService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PatientController.class)
@Import(PatientExceptionHandler.class)
@WithMockUser
class PatientControllerTest {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @MockitoBean private PatientService service;

    @Test
    void createReturns201LocationAndPatientDetails() throws Exception {
        when(service.createPatient(any())).thenReturn(response(true));
        mvc.perform(post("/api/patients").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(createJson()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/patients/7"))
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.patientCode").value("CLINIC-42"))
                .andExpect(jsonPath("$.firstName").value("First"))
                .andExpect(jsonPath("$.active").value(true));
        ArgumentCaptor<CreatePatientRequest> captor = ArgumentCaptor.forClass(CreatePatientRequest.class);
        verify(service).createPatient(captor.capture());
        assertThat(captor.getValue().getPatientCode()).isEqualTo("CLINIC-42");
    }

    @Test
    void missingRequiredCreateFieldsReturn400BeforeServiceCall() throws Exception {
        mvc.perform(post("/api/patients").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.fieldErrors.patientCode").exists())
                .andExpect(jsonPath("$.fieldErrors.firstName").exists())
                .andExpect(jsonPath("$.fieldErrors.lastName").exists())
                .andExpect(jsonPath("$.fieldErrors.dateOfBirth").exists())
                .andExpect(jsonPath("$.fieldErrors.gender").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"patientCode", "dateOfBirth", "email", "phone"})
    void createRejectsInvalidConfirmedContractFields(String field) throws Exception {
        ObjectNode body = (ObjectNode) mapper.readTree(createJson());
        switch (field) {
            case "patientCode" -> body.put(field, " ");
            case "dateOfBirth" -> body.put(field, LocalDate.now().plusDays(1).toString());
            case "email" -> body.put(field, "invalid-email");
            case "phone" -> body.put(field, "x".repeat(26));
        }
        mvc.perform(post("/api/patients").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors." + field).exists());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void getReturnsEitherLifecycleStateWithoutAuthenticationInternals(boolean active) throws Exception {
        when(service.getPatientById(7L)).thenReturn(response(active));
        mvc.perform(get("/api/patients/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.active").value(active))
                .andExpect(jsonPath("$.allergies").value("Allergy history"))
                .andExpect(jsonPath("$.userId").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.version").doesNotExist());
    }

    @Test
    void missingPatientReturns404() throws Exception {
        when(service.getPatientById(99L)).thenThrow(new PatientNotFoundException(99L));
        mvc.perform(get("/api/patients/99"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message", containsString("99")));
    }

    @Test
    void listBindsAllFiltersPaginationAndSortAndReturnsSummaries() throws Exception {
        when(service.searchPatients(eq("first"), eq(false), eq(Gender.OTHER), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(PatientSummaryResponse.fromEntity(patient(false))),
                        invocation.getArgument(3), 3));
        mvc.perform(get("/api/patients").param("search", "first").param("active", "false")
                        .param("gender", "OTHER").param("page", "1").param("size", "2").param("sort", "firstName,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(7))
                .andExpect(jsonPath("$.content[0].allergies").doesNotExist())
                .andExpect(jsonPath("$.content[0].userId").doesNotExist())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3));
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(service).searchPatients(eq("first"), eq(false), eq(Gender.OTHER), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(captor.getValue().getSort().getOrderFor("firstName").isDescending()).isTrue();
    }

    @Test
    void listDefaultsToTwentyRowsWithStableNameSort() throws Exception {
        when(service.searchPatients(isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenAnswer(invocation -> Page.empty(invocation.getArgument(3)));
        mvc.perform(get("/api/patients"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.size").value(20));
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(service).searchPatients(isNull(), isNull(), isNull(), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getSort()).extracting(order -> order.getProperty())
                .containsExactly("lastName", "firstName", "id");
    }

    @Test
    void updateUsesPutAndPassesOnlyExistingProfileContract() throws Exception {
        when(service.updatePatient(eq(7L), any(UpdatePatientRequest.class))).thenReturn(response(true));
        ObjectNode body = (ObjectNode) mapper.readTree(updateJson());
        body.put("userId", 999L).put("patientCode", "REASSIGN").put("active", false).put("password", "ignored");
        mvc.perform(put("/api/patients/7").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.patientCode").value("CLINIC-42"))
                .andExpect(jsonPath("$.userId").doesNotExist());
        ArgumentCaptor<UpdatePatientRequest> captor = ArgumentCaptor.forClass(UpdatePatientRequest.class);
        verify(service).updatePatient(eq(7L), captor.capture());
        assertThat(captor.getValue().getFirstName()).isEqualTo("Updated");
        ObjectNode mapped = mapper.valueToTree(captor.getValue());
        assertThat(mapped.has("userId")).isFalse();
        assertThat(mapped.has("patientCode")).isFalse();
        assertThat(mapped.has("active")).isFalse();
        assertThat(mapped.has("password")).isFalse();
    }

    @Test
    void invalidUpdateReturns400AndDoesNotCallService() throws Exception {
        ObjectNode body = (ObjectNode) mapper.readTree(updateJson());
        body.put("firstName", " ").put("email", "invalid").put("dateOfBirth", LocalDate.now().plusDays(1).toString());
        mvc.perform(put("/api/patients/7").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.firstName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.dateOfBirth").exists());
        verifyNoInteractions(service);
    }

    @Test
    void updateMissingPatientReturns404() throws Exception {
        when(service.updatePatient(eq(99L), any())).thenThrow(new PatientNotFoundException(99L));
        mvc.perform(put("/api/patients/99").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(updateJson()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deactivatePassesReasonAndFalseStatus() throws Exception {
        when(service.updatePatientStatus(eq(7L), any())).thenReturn(response(false));
        mvc.perform(patch("/api/patients/7/deactivate").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deactivationReason\":\"Relocated\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        ArgumentCaptor<UpdatePatientStatusRequest> captor = ArgumentCaptor.forClass(UpdatePatientStatusRequest.class);
        verify(service).updatePatientStatus(eq(7L), captor.capture());
        assertThat(captor.getValue().getActive()).isFalse();
        assertThat(captor.getValue().getDeactivationReason()).isEqualTo("Relocated");
    }

    @Test
    void deactivateAllowsOmittedReason() throws Exception {
        when(service.updatePatientStatus(eq(7L), any())).thenReturn(response(false));
        mvc.perform(patch("/api/patients/7/deactivate").with(csrf())).andExpect(status().isOk());
        ArgumentCaptor<UpdatePatientStatusRequest> captor = ArgumentCaptor.forClass(UpdatePatientStatusRequest.class);
        verify(service).updatePatientStatus(eq(7L), captor.capture());
        assertThat(captor.getValue().getActive()).isFalse();
        assertThat(captor.getValue().getDeactivationReason()).isNull();
    }

    @Test
    void oversizedDeactivationReasonReturns400() throws Exception {
        String body = mapper.createObjectNode().put("deactivationReason", "x".repeat(256)).toString();
        mvc.perform(patch("/api/patients/7/deactivate").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.deactivationReason").exists());
        verifyNoInteractions(service);
    }

    @Test
    void reactivatePassesTrueStatusWithoutPayload() throws Exception {
        when(service.updatePatientStatus(eq(7L), any())).thenReturn(response(true));
        mvc.perform(patch("/api/patients/7/reactivate").with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true));
        ArgumentCaptor<UpdatePatientStatusRequest> captor = ArgumentCaptor.forClass(UpdatePatientStatusRequest.class);
        verify(service).updatePatientStatus(eq(7L), captor.capture());
        assertThat(captor.getValue().getActive()).isTrue();
        assertThat(captor.getValue().getDeactivationReason()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"deactivate", "reactivate"})
    void lifecycleMissingPatientReturns404(String action) throws Exception {
        when(service.updatePatientStatus(eq(99L), any())).thenThrow(new PatientNotFoundException(99L));
        mvc.perform(patch("/api/patients/99/" + action).with(csrf()))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void duplicateCodeReturns409() throws Exception {
        when(service.createPatient(any())).thenThrow(new DuplicatePatientCodeException("CLINIC-42"));
        mvc.perform(post("/api/patients").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(createJson()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message", containsString("CLINIC-42")));
    }

    @ParameterizedTest
    @MethodSource("serviceErrors")
    void serviceFailuresUseAppropriateHttpStatusWithoutDatabaseInternals(RuntimeException failure, int statusCode, String message) throws Exception {
        when(service.updatePatientStatus(eq(7L), any())).thenThrow(failure);
        mvc.perform(patch("/api/patients/7/reactivate").with(csrf()))
                .andExpect(status().is(statusCode)).andExpect(jsonPath("$.message").value(message));
    }

    static Stream<Arguments> serviceErrors() {
        return Stream.of(
                Arguments.of(new IllegalArgumentException("Invalid patient request"), 400, "Invalid patient request"),
                Arguments.of(new IllegalStateException("Invalid patient state"), 409, "Invalid patient state"),
                Arguments.of(new OptimisticLockingFailureException("internal details"), 409,
                        "Patient record changed concurrently; reload it before retrying"),
                Arguments.of(new DataIntegrityViolationException("SQL constraint internal details"), 409,
                        "Patient record conflicts with existing data"));
    }

    @Test
    void serviceConstraintViolationsBecomeFieldErrors() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            UpdatePatientStatusRequest invalid = new UpdatePatientStatusRequest();
            when(service.updatePatientStatus(eq(7L), any())).thenThrow(
                    new ConstraintViolationException(factory.getValidator().validate(invalid)));
            mvc.perform(patch("/api/patients/7/reactivate").with(csrf()))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.active").exists());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{", "{\"gender\":\"UNKNOWN\"}", "{\"dateOfBirth\":\"invalid\"}"})
    void missingMalformedOrUnparseableCreateBodyReturns400(String body) throws Exception {
        mvc.perform(post("/api/patients").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Bad Request"));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/patients/not-a-number", "/api/patients?gender=UNKNOWN", "/api/patients?active=invalid"})
    void invalidPathOrFilterValuesReturn400(String url) throws Exception {
        mvc.perform(get(url)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/patients", "/api/patients/7"})
    void noHardDeleteEndpointExists(String url) throws Exception {
        mvc.perform(delete(url).with(csrf())).andExpect(status().isMethodNotAllowed());
        verifyNoInteractions(service);
    }

    @Test
    @WithAnonymousUser
    void anonymousReadIsRejectedByExistingSecurity() throws Exception {
        mvc.perform(get("/api/patients/7")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    @WithAnonymousUser
    void anonymousCreateWithCsrfStillRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/patients").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(createJson()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void authenticatedMutationsRequireCsrf() throws Exception {
        mvc.perform(post("/api/patients").contentType(MediaType.APPLICATION_JSON).content(createJson()))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/patients/7").contentType(MediaType.APPLICATION_JSON).content(updateJson()))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/patients/7/deactivate")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/patients/7/reactivate")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    private String createJson() throws Exception {
        return mapper.writeValueAsString(new CreatePatientRequest("CLINIC-42", "First", "Last",
                LocalDate.of(1990, 1, 1), Gender.OTHER, "123"));
    }

    private String updateJson() throws Exception {
        return mapper.writeValueAsString(new UpdatePatientRequest("Updated", "Last",
                LocalDate.of(1990, 1, 1), Gender.OTHER, "456"));
    }

    private PatientResponse response(boolean active) {
        return PatientResponse.fromEntity(patient(active));
    }

    private Patient patient(boolean active) {
        Patient patient = new Patient("CLINIC-42", "First", "Last", LocalDate.of(1990, 1, 1), Gender.OTHER, "123");
        patient.setId(7L);
        patient.setUserId(19L);
        patient.setActive(active);
        patient.setAllergies("Allergy history");
        patient.setVersion(1L);
        patient.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));
        return patient;
    }
}
