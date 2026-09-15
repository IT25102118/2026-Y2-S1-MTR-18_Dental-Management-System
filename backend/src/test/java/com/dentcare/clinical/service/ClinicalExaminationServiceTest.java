package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.ClinicalExaminationResponse;
import com.dentcare.clinical.dto.ConfirmDiagnosisRequest;
import com.dentcare.clinical.dto.CreateClinicalExaminationRequest;
import com.dentcare.clinical.dto.UpdateClinicalExaminationRequest;
import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.DentistNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidDiagnosisConfirmationException;
import com.dentcare.clinical.exception.PatientMismatchException;
import com.dentcare.clinical.exception.PatientNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.clinical.integration.PatientLookupPort;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.clinical.security.CurrentDentistProvider;
import com.dentcare.clinical.security.Dentist;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClinicalExaminationServiceTest {

    @Mock
    private ClinicalExaminationRepository examinationRepository;

    @Mock
    private PatientLookupPort patientLookupPort;

    @Mock
    private DentistLookupPort dentistLookupPort;

    @Mock
    private CurrentDentistProvider currentDentistProvider;

    @InjectMocks
    private ClinicalExaminationServiceImpl examinationService;

    private static final Long PATIENT_ID = 101L;
    private static final Long DENTIST_ID = 202L;
    private static final Long ASSISTANT_ID = 303L;
    private static final Long EXAM_ID = 501L;

    private ClinicalExamination draftExam;

    @BeforeEach
    void setUp() {
        lenient().when(currentDentistProvider.getCurrentDentist()).thenReturn(new Dentist(DENTIST_ID));

        draftExam = new ClinicalExamination(
                PATIENT_ID,
                DENTIST_ID,
                ASSISTANT_ID,
                LocalDate.of(2026, 3, 15),
                "Severe molar pain"
        );
        draftExam.setId(EXAM_ID);
        draftExam.setStatus(ExaminationStatus.DRAFT);
        draftExam.setDiagnosisConfirmed(false);
    }

    @Nested
    @DisplayName("1. Patient / Dentist Validation Tests")
    class PatientDentistValidationTests {

        @Test
        @DisplayName("Test 1: Valid active patient and dentist allows examination creation")
        void createDraftExamination_validPatientAndDentist_createsDraftSuccessfully() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);
            when(examinationRepository.save(any(ClinicalExamination.class))).thenAnswer(invocation -> {
                ClinicalExamination exam = invocation.getArgument(0);
                exam.setId(EXAM_ID);
                return exam;
            });

            CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                    PATIENT_ID,
                    DENTIST_ID,
                    null,
                    ASSISTANT_ID,
                    LocalDate.of(2026, 3, 15),
                    "Severe molar pain",
                    "Visible caries on tooth 36",
                    "Deep dental caries",
                    null,
                    null
            );

            ClinicalExaminationResponse response = examinationService.createDraftExamination(request);

            assertThat(response).isNotNull();
            assertThat(response.id()).isEqualTo(EXAM_ID);
            assertThat(response.patientId()).isEqualTo(PATIENT_ID);
            assertThat(response.dentistId()).isEqualTo(DENTIST_ID);
            assertThat(response.status()).isEqualTo(ExaminationStatus.DRAFT);
            assertThat(response.isDiagnosisConfirmed()).isFalse();
            assertThat(response.chiefComplaint()).isEqualTo("Severe molar pain");
            verify(examinationRepository).save(any(ClinicalExamination.class));
        }

        @Test
        @DisplayName("Test 2: Non-existent or inactive patient is rejected with PatientNotFoundException")
        void createDraftExamination_invalidPatient_throwsPatientNotFoundException() {
            when(patientLookupPort.existsActivePatient(999L)).thenReturn(false);

            CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                    999L, DENTIST_ID, null, ASSISTANT_ID, LocalDate.now(), "Toothache", null, null, null, null
            );

            assertThatThrownBy(() -> examinationService.createDraftExamination(request))
                    .isInstanceOf(PatientNotFoundException.class)
                    .hasMessageContaining("999");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 3 & 4: Non-existent or inactive dentist is rejected with DentistNotFoundException")
        void createDraftExamination_invalidDentist_throwsDentistNotFoundException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(999L)).thenReturn(false);

            CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                    PATIENT_ID, 999L, null, ASSISTANT_ID, LocalDate.now(), "Toothache", null, null, null, null
            );

            assertThatThrownBy(() -> examinationService.createDraftExamination(request))
                    .isInstanceOf(DentistNotFoundException.class)
                    .hasMessageContaining("999");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when chief complaint is blank")
        void createDraftExamination_blankChiefComplaint_throwsIllegalArgumentException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            CreateClinicalExaminationRequest request = new CreateClinicalExaminationRequest(
                    PATIENT_ID, DENTIST_ID, null, ASSISTANT_ID, LocalDate.now(), "   ", null, null, null, null
            );

            assertThatThrownBy(() -> examinationService.createDraftExamination(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Chief complaint is required");
        }
    }

    @Nested
    @DisplayName("2. Patient Ownership & Cross-Patient Protection Tests")
    class OwnershipTests {

        @Test
        @DisplayName("Test 5: Patient mismatch is rejected when accessing examination by ID and patient ID")
        void getExaminationByIdAndPatientId_patientMismatch_throwsPatientMismatchException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            Long wrongPatientId = 999L;

            assertThatThrownBy(() -> examinationService.getExaminationByIdAndPatientId(EXAM_ID, wrongPatientId))
                    .isInstanceOf(PatientMismatchException.class)
                    .hasMessageContaining("does not belong to patient 999");
        }

        @Test
        @DisplayName("Accessing examination with matching patient ID succeeds")
        void getExaminationByIdAndPatientId_matchingPatient_returnsResponse() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            ClinicalExaminationResponse response = examinationService.getExaminationByIdAndPatientId(EXAM_ID, PATIENT_ID);

            assertThat(response.id()).isEqualTo(EXAM_ID);
            assertThat(response.patientId()).isEqualTo(PATIENT_ID);
        }

        @Test
        @DisplayName("Test 7: Cross-patient examination update is rejected with PatientMismatchException")
        void updateDraftExamination_crossPatientMismatch_throwsPatientMismatchException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            Long wrongPatientId = 888L;
            UpdateClinicalExaminationRequest request = new UpdateClinicalExaminationRequest(
                    null, "Updated complaint", null, null, null, null
            );

            assertThatThrownBy(() -> examinationService.updateDraftExamination(EXAM_ID, wrongPatientId, request))
                    .isInstanceOf(PatientMismatchException.class)
                    .hasMessageContaining("does not belong to patient 888");
            verify(examinationRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("3. Diagnosis Authorization & Audit Tests")
    class DiagnosisAuthorizationTests {

        @Test
        @DisplayName("Test 13, 21, 22: Active Dentist can confirm diagnosis; stores dentist and timestamp")
        void confirmDiagnosis_validActiveDentist_confirmsSuccessfully() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(examinationRepository.save(any(ClinicalExamination.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest("Irreversible pulpitis on tooth 36");

            ClinicalExaminationResponse response = examinationService.confirmDiagnosis(EXAM_ID, request);

            assertThat(response.isDiagnosisConfirmed()).isTrue();
            assertThat(response.confirmedDiagnosis()).isEqualTo("Irreversible pulpitis on tooth 36");
            assertThat(response.confirmedByDentistId()).isEqualTo(DENTIST_ID);
            assertThat(response.diagnosisConfirmedAt()).isNotNull();
            verify(examinationRepository).save(draftExam);
        }

        @Test
        @DisplayName("Test 14: Dental Assistant cannot confirm diagnosis; throws UnauthorizedClinicalOperationException")
        void confirmDiagnosis_dentalAssistant_throwsUnauthorizedException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Authenticated user " + ASSISTANT_ID + " is not an active dentist authorized to perform clinical operations"));

            ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest("Irreversible pulpitis");

            assertThatThrownBy(() -> examinationService.confirmDiagnosis(EXAM_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("not an active dentist authorized to perform clinical operations");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 15: Inactive or non-existent Dentist cannot confirm diagnosis")
        void confirmDiagnosis_inactiveDentist_throwsUnauthorizedException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Authenticated user 999 is not an active dentist authorized to perform clinical operations"));

            ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest("Irreversible pulpitis");

            assertThatThrownBy(() -> examinationService.confirmDiagnosis(EXAM_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("not an active dentist");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws UnauthorizedClinicalOperationException when unauthenticated caller attempts to confirm diagnosis")
        void confirmDiagnosis_unauthenticatedCaller_throwsUnauthorizedException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("No authenticated user in security context"));

            ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest("Irreversible pulpitis");

            assertThatThrownBy(() -> examinationService.confirmDiagnosis(EXAM_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("No authenticated user in security context");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws InvalidDiagnosisConfirmationException when diagnosis text is blank")
        void confirmDiagnosis_blankDiagnosis_throwsException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest("   ");

            assertThatThrownBy(() -> examinationService.confirmDiagnosis(EXAM_ID, request))
                    .isInstanceOf(InvalidDiagnosisConfirmationException.class)
                    .hasMessageContaining("Confirmed diagnosis cannot be blank");
        }

        @Test
        @DisplayName("Throws InvalidDiagnosisConfirmationException when attempting to overwrite confirmed diagnosis")
        void confirmDiagnosis_alreadyConfirmed_throwsException() {
            draftExam.setDiagnosisConfirmed(true);
            draftExam.setConfirmedDiagnosis("Initial diagnosis");
            draftExam.setConfirmedByDentistId(DENTIST_ID);
            draftExam.setDiagnosisConfirmedAt(LocalDateTime.now());
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            ConfirmDiagnosisRequest request = new ConfirmDiagnosisRequest("Overwrite attempt");

            assertThatThrownBy(() -> examinationService.confirmDiagnosis(EXAM_ID, request))
                    .isInstanceOf(InvalidDiagnosisConfirmationException.class)
                    .hasMessageContaining("already been confirmed and cannot be overwritten");
        }
    }

    @Nested
    @DisplayName("4. Lifecycle & State Transition Tests")
    class LifecycleTests {

        @Test
        @DisplayName("Test 16: DRAFT examination can be completed by authorized Dentist")
        void completeExamination_authorizedDentist_transitionsToCompleted() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(examinationRepository.save(any(ClinicalExamination.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ClinicalExaminationResponse response = examinationService.completeExamination(EXAM_ID);

            assertThat(response.status()).isEqualTo(ExaminationStatus.COMPLETED);
            verify(examinationRepository).save(draftExam);
        }

        @Test
        @DisplayName("Dental Assistant cannot complete examination; throws UnauthorizedClinicalOperationException")
        void completeExamination_dentalAssistant_throwsUnauthorizedException() {
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Only an active dentist can complete/finalize"));

            assertThatThrownBy(() -> examinationService.completeExamination(EXAM_ID))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("Only an active dentist can complete/finalize");
            verify(examinationRepository, never()).save(draftExam);
        }

        @Test
        @DisplayName("Test 17: Completed examination cannot be modified")
        void updateDraftExamination_completedExam_throwsInvalidStateException() {
            draftExam.setStatus(ExaminationStatus.COMPLETED);
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            UpdateClinicalExaminationRequest request = new UpdateClinicalExaminationRequest(
                    null, "New complaint", null, null, null, null
            );

            assertThatThrownBy(() -> examinationService.updateDraftExamination(EXAM_ID, request))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Cannot modify an examination that has status: COMPLETED");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 18 & 23: DRAFT examination can be cancelled by authorized Dentist; stores CANCELLED status")
        void cancelExamination_authorizedDentist_transitionsToCancelled() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(examinationRepository.save(any(ClinicalExamination.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ClinicalExaminationResponse response = examinationService.cancelExamination(EXAM_ID);

            assertThat(response.status()).isEqualTo(ExaminationStatus.CANCELLED);
            verify(examinationRepository).save(draftExam);
        }

        @Test
        @DisplayName("Dental Assistant cannot cancel examination; throws UnauthorizedClinicalOperationException")
        void cancelExamination_dentalAssistant_throwsUnauthorizedException() {
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Only an active dentist can cancel"));

            assertThatThrownBy(() -> examinationService.cancelExamination(EXAM_ID))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("Only an active dentist can cancel");
            verify(examinationRepository, never()).save(draftExam);
        }

        @Test
        @DisplayName("Test 19: Completed examination cannot be cancelled (clinical history preservation)")
        void cancelExamination_completedExam_throwsInvalidStateException() {
            draftExam.setStatus(ExaminationStatus.COMPLETED);
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            assertThatThrownBy(() -> examinationService.cancelExamination(EXAM_ID))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Cannot cancel a completed examination; clinical history must be preserved");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 20: Cancelled examination cannot transition back to active/completed state")
        void completeExamination_cancelledExam_throwsInvalidStateException() {
            draftExam.setStatus(ExaminationStatus.CANCELLED);
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            assertThatThrownBy(() -> examinationService.completeExamination(EXAM_ID))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Cannot complete a cancelled examination");
            verify(examinationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 20b: Already cancelled examination cannot be cancelled again")
        void cancelExamination_alreadyCancelled_throwsInvalidStateException() {
            draftExam.setStatus(ExaminationStatus.CANCELLED);
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            assertThatThrownBy(() -> examinationService.cancelExamination(EXAM_ID))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Examination is already cancelled");
            verify(examinationRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("5. Examination Query Tests")
    class QueryTests {

        @Test
        @DisplayName("Retrieves examination by ID")
        void getExaminationById_existingExam_returnsResponse() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            ClinicalExaminationResponse response = examinationService.getExaminationById(EXAM_ID);

            assertThat(response.id()).isEqualTo(EXAM_ID);
        }

        @Test
        @DisplayName("Throws ClinicalExaminationNotFoundException for non-existent examination")
        void getExaminationById_nonexistentExam_throwsException() {
            when(examinationRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> examinationService.getExaminationById(999L))
                    .isInstanceOf(ClinicalExaminationNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("Retrieves examinations by patient ID in reverse chronological order")
        void getExaminationsByPatientId_returnsList() {
            when(examinationRepository.findByPatientIdOrderByExaminationDateDescIdDesc(PATIENT_ID))
                    .thenReturn(List.of(draftExam));

            List<ClinicalExaminationResponse> responses = examinationService.getExaminationsByPatientId(PATIENT_ID);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).patientId()).isEqualTo(PATIENT_ID);
        }

        @Test
        @DisplayName("Retrieves examinations by dentist ID in reverse chronological order")
        void getExaminationsByDentistId_returnsList() {
            when(examinationRepository.findByDentistIdOrderByExaminationDateDescIdDesc(DENTIST_ID))
                    .thenReturn(List.of(draftExam));

            List<ClinicalExaminationResponse> responses = examinationService.getExaminationsByDentistId(DENTIST_ID);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).dentistId()).isEqualTo(DENTIST_ID);
        }
    }
}
