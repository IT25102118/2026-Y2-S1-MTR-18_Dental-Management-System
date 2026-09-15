package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.ApproveTreatmentPlanRequest;
import com.dentcare.clinical.dto.CancelTreatmentPlanRequest;
import com.dentcare.clinical.dto.CreateTreatmentPlanRequest;
import com.dentcare.clinical.dto.FollowUpRequest;
import com.dentcare.clinical.dto.TreatmentPlanResponse;
import com.dentcare.clinical.dto.UpdateTreatmentPlanRequest;
import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ClinicalProgressNote;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.DentistNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidTreatmentPlanStateException;
import com.dentcare.clinical.exception.PatientMismatchException;
import com.dentcare.clinical.exception.PatientNotFoundException;
import com.dentcare.clinical.exception.TreatmentPlanNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.clinical.integration.PatientLookupPort;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.clinical.repository.ClinicalProgressNoteRepository;
import com.dentcare.clinical.repository.TreatmentPlanRepository;
import com.dentcare.clinical.repository.TreatmentProcedureRepository;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
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
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("TreatmentPlanService Domain Unit Tests")
class TreatmentPlanServiceTest {

    @Mock
    private TreatmentPlanRepository treatmentPlanRepository;

    @Mock
    private TreatmentProcedureRepository treatmentProcedureRepository;

    @Mock
    private ClinicalExaminationRepository clinicalExaminationRepository;

    @Mock
    private ClinicalProgressNoteRepository clinicalProgressNoteRepository;

    @Mock
    private PatientLookupPort patientLookupPort;

    @Mock
    private DentistLookupPort dentistLookupPort;

    @Mock
    private CurrentDentistProvider currentDentistProvider;

    @InjectMocks
    private TreatmentPlanServiceImpl treatmentPlanService;

    private static final Long PATIENT_ID = 101L;
    private static final Long DENTIST_ID = 202L;
    private static final Long RECORDER_ID = 303L;
    private static final Long EXAM_ID = 501L;
    private static final Long PLAN_ID = 601L;

    private TreatmentPlan proposedPlan;
    private ClinicalExamination examination;

    @BeforeEach
    void setUp() {
        lenient().when(currentDentistProvider.getCurrentDentist()).thenReturn(new Dentist(DENTIST_ID));

        proposedPlan = new TreatmentPlan(
                PATIENT_ID,
                DENTIST_ID,
                EXAM_ID,
                RECORDER_ID,
                "Root Canal & Crown Plan"
        );
        proposedPlan.setId(PLAN_ID);
        proposedPlan.setStatus(TreatmentPlanStatus.PROPOSED);
        proposedPlan.setTotalEstimatedCost(new BigDecimal("15000.00"));
        proposedPlan.setTotalActualCost(BigDecimal.ZERO);
        proposedPlan.setCreatedAt(LocalDateTime.now().minusDays(2));

        examination = new ClinicalExamination(
                PATIENT_ID,
                DENTIST_ID,
                RECORDER_ID,
                LocalDate.now(),
                "Severe toothache"
        );
        examination.setId(EXAM_ID);
        examination.setStatus(ExaminationStatus.COMPLETED);
    }

    @Nested
    @DisplayName("1. Treatment Plan Creation Tests")
    class CreateTreatmentPlanTests {

        @Test
        @DisplayName("Valid plan creation with initial status PROPOSED")
        void createTreatmentPlan_validPatientAndDentist_createsProposedPlan() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);
            when(clinicalExaminationRepository.findById(EXAM_ID)).thenReturn(Optional.of(examination));
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> {
                TreatmentPlan p = invocation.getArgument(0);
                p.setId(PLAN_ID);
                return p;
            });

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID,
                    DENTIST_ID,
                    EXAM_ID,
                    RECORDER_ID,
                    "Comprehensive Restorative Plan",
                    new BigDecimal("25000.00"),
                    "Requires multi-stage crowns"
            );

            TreatmentPlanResponse response = treatmentPlanService.createTreatmentPlan(request);

            assertThat(response).isNotNull();
            assertThat(response.id()).isEqualTo(PLAN_ID);
            assertThat(response.patientId()).isEqualTo(PATIENT_ID);
            assertThat(response.dentistId()).isEqualTo(DENTIST_ID);
            assertThat(response.examinationId()).isEqualTo(EXAM_ID);
            assertThat(response.status()).isEqualTo(TreatmentPlanStatus.PROPOSED);
            assertThat(response.totalEstimatedCost()).isEqualByComparingTo("25000.00");
            assertThat(response.totalActualCost()).isEqualByComparingTo("0.00");
            assertThat(response.planName()).isEqualTo("Comprehensive Restorative Plan");
            verify(treatmentPlanRepository).save(any(TreatmentPlan.class));
        }

        @Test
        @DisplayName("Throws PatientNotFoundException for non-existent patient")
        void createTreatmentPlan_nonexistentPatient_throwsPatientNotFoundException() {
            when(patientLookupPort.existsActivePatient(999L)).thenReturn(false);

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    999L, DENTIST_ID, null, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(PatientNotFoundException.class)
                    .hasMessageContaining("999");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws PatientNotFoundException for inactive patient")
        void createTreatmentPlan_inactivePatient_throwsPatientNotFoundException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(false);

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, null, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(PatientNotFoundException.class);
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws DentistNotFoundException for non-existent dentist")
        void createTreatmentPlan_nonexistentDentist_throwsDentistNotFoundException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(999L)).thenReturn(false);

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, 999L, null, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(DentistNotFoundException.class)
                    .hasMessageContaining("999");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws DentistNotFoundException for inactive dentist")
        void createTreatmentPlan_inactiveDentist_throwsDentistNotFoundException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(false);

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, null, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(DentistNotFoundException.class);
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws ClinicalExaminationNotFoundException for non-existent examination")
        void createTreatmentPlan_nonexistentExamination_throwsException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);
            when(clinicalExaminationRepository.findById(999L)).thenReturn(Optional.empty());

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, 999L, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(ClinicalExaminationNotFoundException.class)
                    .hasMessageContaining("999");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws PatientMismatchException when examination belongs to different patient")
        void createTreatmentPlan_examinationBelongsToDifferentPatient_throwsException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            ClinicalExamination otherPatientExam = new ClinicalExamination(
                    999L, DENTIST_ID, RECORDER_ID, LocalDate.now(), "Complaint"
            );
            otherPatientExam.setId(EXAM_ID);
            when(clinicalExaminationRepository.findById(EXAM_ID)).thenReturn(Optional.of(otherPatientExam));

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, EXAM_ID, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(PatientMismatchException.class);
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws InvalidClinicalExaminationStateException when examination is cancelled")
        void createTreatmentPlan_cancelledExamination_throwsException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            examination.setStatus(ExaminationStatus.CANCELLED);
            when(clinicalExaminationRepository.findById(EXAM_ID)).thenReturn(Optional.of(examination));

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, EXAM_ID, RECORDER_ID, "Plan", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("cancelled examination");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when plan name is blank")
        void createTreatmentPlan_blankPlanName_throwsIllegalArgumentException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, null, RECORDER_ID, "   ", BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Plan name is required");
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when estimated cost is negative")
        void createTreatmentPlan_negativeEstimatedCost_throwsIllegalArgumentException() {
            when(patientLookupPort.existsActivePatient(PATIENT_ID)).thenReturn(true);
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            CreateTreatmentPlanRequest request = new CreateTreatmentPlanRequest(
                    PATIENT_ID, DENTIST_ID, null, RECORDER_ID, "Plan", new BigDecimal("-10.00"), null
            );

            assertThatThrownBy(() -> treatmentPlanService.createTreatmentPlan(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cannot be negative");
        }
    }

    @Nested
    @DisplayName("2. Lifecycle & Approval Tests")
    class LifecycleAndApprovalTests {

        @Test
        @DisplayName("Valid approval by authorized dentist transitions to APPROVED when procedures present")
        void approveTreatmentPlan_validDentist_transitionsToApproved() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);
            when(treatmentProcedureRepository.countByTreatmentPlanId(PLAN_ID)).thenReturn(1L);
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.PLANNED)).thenReturn(1L);
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest();
            TreatmentPlanResponse response = treatmentPlanService.approveTreatmentPlan(PLAN_ID, request);

            assertThat(response.status()).isEqualTo(TreatmentPlanStatus.APPROVED);
            assertThat(response.approvedByDentistId()).isEqualTo(DENTIST_ID);
            assertThat(response.approvedAt()).isNotNull();
            verify(treatmentPlanRepository).save(proposedPlan);
        }

        @Test
        @DisplayName("Approval by non-existent or inactive dentist throws UnauthorizedClinicalOperationException")
        void approveTreatmentPlan_invalidDentist_throwsUnauthorizedException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Authenticated user " + RECORDER_ID + " is not an active dentist"));

            ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest();

            assertThatThrownBy(() -> treatmentPlanService.approveTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("not an active dentist");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Approval by unauthenticated caller throws UnauthorizedClinicalOperationException")
        void approveTreatmentPlan_unauthenticatedCaller_throwsUnauthorizedException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("No authenticated user in security context"));

            ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest();

            assertThatThrownBy(() -> treatmentPlanService.approveTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("No authenticated user in security context");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Approval of plan with zero procedures throws InvalidTreatmentPlanStateException")
        void approveTreatmentPlan_zeroProcedures_throwsException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);
            when(treatmentProcedureRepository.countByTreatmentPlanId(PLAN_ID)).thenReturn(0L);

            ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest();

            assertThatThrownBy(() -> treatmentPlanService.approveTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("requires at least one valid planned procedure");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Approval of CANCELLED plan throws InvalidTreatmentPlanStateException")
        void approveTreatmentPlan_cancelledPlan_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.CANCELLED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest();

            assertThatThrownBy(() -> treatmentPlanService.approveTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("Cannot approve a cancelled treatment plan");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Approval of already APPROVED plan throws InvalidTreatmentPlanStateException")
        void approveTreatmentPlan_alreadyApproved_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.APPROVED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(dentistLookupPort.existsActiveDentist(DENTIST_ID)).thenReturn(true);

            ApproveTreatmentPlanRequest request = new ApproveTreatmentPlanRequest();

            assertThatThrownBy(() -> treatmentPlanService.approveTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("already been approved");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Valid start transitions APPROVED plan to IN_PROGRESS")
        void startTreatmentPlan_approvedPlan_transitionsToInProgress() {
            proposedPlan.setStatus(TreatmentPlanStatus.APPROVED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

            TreatmentPlanResponse response = treatmentPlanService.startTreatmentPlan(PLAN_ID);

            assertThat(response.status()).isEqualTo(TreatmentPlanStatus.IN_PROGRESS);
            verify(treatmentPlanRepository).save(proposedPlan);
        }

        @Test
        @DisplayName("Starting plan with inactive dentist throws UnauthorizedClinicalOperationException")
        void startTreatmentPlan_inactiveDentist_throwsUnauthorizedException() {
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Authenticated user 999 is not an active dentist"));

            assertThatThrownBy(() -> treatmentPlanService.startTreatmentPlan(PLAN_ID))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("not an active dentist");
        }

        @Test
        @DisplayName("Invalid start from PROPOSED throws InvalidTreatmentPlanStateException")
        void startTreatmentPlan_proposedPlan_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.PROPOSED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            assertThatThrownBy(() -> treatmentPlanService.startTreatmentPlan(PLAN_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("plan must be approved first");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Valid completion when all procedures are finished")
        void completeTreatmentPlan_inProgressWithNoUnfinishedProcedures_transitionsToCompleted() {
            proposedPlan.setStatus(TreatmentPlanStatus.IN_PROGRESS);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.PLANNED)).thenReturn(0L);
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.IN_PROGRESS)).thenReturn(0L);
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.COMPLETED)).thenReturn(1L);
            when(treatmentProcedureRepository.findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(PLAN_ID)).thenReturn(Collections.emptyList());
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

            TreatmentPlanResponse response = treatmentPlanService.completeTreatmentPlan(PLAN_ID);

            assertThat(response.status()).isEqualTo(TreatmentPlanStatus.COMPLETED);
            assertThat(response.completedAt()).isNotNull();
            verify(treatmentPlanRepository).save(proposedPlan);
        }

        @Test
        @DisplayName("Completion with unfinished procedures is rejected")
        void completeTreatmentPlan_unfinishedProceduresExist_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.IN_PROGRESS);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.PLANNED)).thenReturn(1L);
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.IN_PROGRESS)).thenReturn(0L);

            assertThatThrownBy(() -> treatmentPlanService.completeTreatmentPlan(PLAN_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("contains 1 unfinished procedures");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Completion with 0 completed procedures is rejected")
        void completeTreatmentPlan_zeroCompletedProcedures_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.IN_PROGRESS);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.PLANNED)).thenReturn(0L);
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.IN_PROGRESS)).thenReturn(0L);
            when(treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(PLAN_ID, ProcedureStatus.COMPLETED)).thenReturn(0L);

            assertThatThrownBy(() -> treatmentPlanService.completeTreatmentPlan(PLAN_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("without at least one completed procedure");
            verify(treatmentPlanRepository, never()).save(any());
        }

        @Test
        @DisplayName("Invalid completion when plan is in PROPOSED status")
        void completeTreatmentPlan_proposedPlan_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.PROPOSED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            assertThatThrownBy(() -> treatmentPlanService.completeTreatmentPlan(PLAN_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("only IN_PROGRESS plans can be completed");
        }

        @Test
        @DisplayName("Valid cancellation by dentist preserves clinical history")
        void cancelTreatmentPlan_validDentistAndReason_transitionsToCancelled() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

            CancelTreatmentPlanRequest request = new CancelTreatmentPlanRequest("Patient relocated");
            TreatmentPlanResponse response = treatmentPlanService.cancelTreatmentPlan(PLAN_ID, request);

            assertThat(response.status()).isEqualTo(TreatmentPlanStatus.CANCELLED);
            assertThat(response.cancellationReason()).isEqualTo("Patient relocated");
            verify(treatmentPlanRepository).save(proposedPlan);
        }

        @Test
        @DisplayName("Cancellation by inactive dentist throws UnauthorizedClinicalOperationException")
        void cancelTreatmentPlan_inactiveDentist_throwsUnauthorizedException() {
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Authenticated user 999 is not an active dentist"));

            CancelTreatmentPlanRequest request = new CancelTreatmentPlanRequest("Patient relocated");

            assertThatThrownBy(() -> treatmentPlanService.cancelTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("not an active dentist");
        }

        @Test
        @DisplayName("Cancellation without reason throws IllegalArgumentException")
        void cancelTreatmentPlan_blankReason_throwsIllegalArgumentException() {
            CancelTreatmentPlanRequest request = new CancelTreatmentPlanRequest("   ");

            assertThatThrownBy(() -> treatmentPlanService.cancelTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Cancellation reason is required");
        }

        @Test
        @DisplayName("Cannot cancel a completed plan")
        void cancelTreatmentPlan_completedPlan_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.COMPLETED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            CancelTreatmentPlanRequest request = new CancelTreatmentPlanRequest("Patient relocated");

            assertThatThrownBy(() -> treatmentPlanService.cancelTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("Cannot cancel a completed treatment plan");
            verify(treatmentPlanRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("3. Update & Plan Modification Tests")
    class UpdatePlanTests {

        @Test
        @DisplayName("Can update plan while in PROPOSED status")
        void updateTreatmentPlan_proposedPlan_updatesSuccessfully() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UpdateTreatmentPlanRequest request = new UpdateTreatmentPlanRequest(
                    "Updated Plan Name",
                    new BigDecimal("18000.00"),
                    "Updated notes"
            );

            TreatmentPlanResponse response = treatmentPlanService.updateTreatmentPlan(PLAN_ID, request);

            assertThat(response.planName()).isEqualTo("Updated Plan Name");
            assertThat(response.totalEstimatedCost()).isEqualByComparingTo("18000.00");
            assertThat(response.clinicalNotes()).isEqualTo("Updated notes");
        }

        @Test
        @DisplayName("Can update plan while in APPROVED status")
        void updateTreatmentPlan_approvedPlan_updatesSuccessfully() {
            proposedPlan.setStatus(TreatmentPlanStatus.APPROVED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UpdateTreatmentPlanRequest request = new UpdateTreatmentPlanRequest(
                    "Updated Plan Name", null, null
            );

            TreatmentPlanResponse response = treatmentPlanService.updateTreatmentPlan(PLAN_ID, request);
            assertThat(response.planName()).isEqualTo("Updated Plan Name");
        }

        @Test
        @DisplayName("Cannot update plan when in IN_PROGRESS status")
        void updateTreatmentPlan_inProgressPlan_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.IN_PROGRESS);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            UpdateTreatmentPlanRequest request = new UpdateTreatmentPlanRequest(
                    "Updated Plan Name", null, null
            );

            assertThatThrownBy(() -> treatmentPlanService.updateTreatmentPlan(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("only PROPOSED or APPROVED plans can be updated");
        }

        @Test
        @DisplayName("Cross-patient update throws PatientMismatchException")
        void updateTreatmentPlan_patientMismatch_throwsException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            UpdateTreatmentPlanRequest request = new UpdateTreatmentPlanRequest("Plan", null, null);

            assertThatThrownBy(() -> treatmentPlanService.updateTreatmentPlan(PLAN_ID, 999L, request))
                    .isInstanceOf(PatientMismatchException.class);
        }
    }

    @Nested
    @DisplayName("4. Follow-up Scheduling Tests")
    class FollowUpTests {

        @Test
        @DisplayName("Valid follow-up date schedules progress note successfully")
        void setFollowUpDate_validDate_createsProgressNote() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));
            when(treatmentPlanRepository.save(any(TreatmentPlan.class))).thenAnswer(i -> i.getArgument(0));
            when(clinicalProgressNoteRepository.save(any(ClinicalProgressNote.class))).thenAnswer(i -> i.getArgument(0));

            FollowUpRequest request = new FollowUpRequest(
                    LocalDate.now().plusWeeks(2),
                    "Routine checkup"
            );

            TreatmentPlanResponse response = treatmentPlanService.setFollowUpDate(PLAN_ID, request);

            assertThat(response).isNotNull();
            verify(clinicalProgressNoteRepository).save(any(ClinicalProgressNote.class));
        }

        @Test
        @DisplayName("Follow-up date before treatment plan creation throws IllegalArgumentException")
        void setFollowUpDate_dateBeforeCreation_throwsIllegalArgumentException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            FollowUpRequest request = new FollowUpRequest(
                    proposedPlan.getCreatedAt().toLocalDate().minusDays(5),
                    "Checkup"
            );

            assertThatThrownBy(() -> treatmentPlanService.setFollowUpDate(PLAN_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cannot be before treatment plan creation date");
            verify(clinicalProgressNoteRepository, never()).save(any());
        }

        @Test
        @DisplayName("Follow-up on cancelled plan throws InvalidTreatmentPlanStateException")
        void setFollowUpDate_cancelledPlan_throwsException() {
            proposedPlan.setStatus(TreatmentPlanStatus.CANCELLED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            FollowUpRequest request = new FollowUpRequest(LocalDate.now().plusDays(5), "Checkup");

            assertThatThrownBy(() -> treatmentPlanService.setFollowUpDate(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("Cannot set follow-up date on a cancelled treatment plan");
        }
    }

    @Nested
    @DisplayName("5. Query Tests")
    class QueryTests {

        @Test
        @DisplayName("getTreatmentPlanById returns response for existing plan")
        void getTreatmentPlanById_existing_returnsResponse() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            TreatmentPlanResponse response = treatmentPlanService.getTreatmentPlanById(PLAN_ID);

            assertThat(response.id()).isEqualTo(PLAN_ID);
        }

        @Test
        @DisplayName("getTreatmentPlanById throws TreatmentPlanNotFoundException for non-existent plan")
        void getTreatmentPlanById_nonexistent_throwsException() {
            when(treatmentPlanRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> treatmentPlanService.getTreatmentPlanById(999L))
                    .isInstanceOf(TreatmentPlanNotFoundException.class);
        }

        @Test
        @DisplayName("getTreatmentPlanByIdAndPatientId with patient mismatch throws PatientMismatchException")
        void getTreatmentPlanByIdAndPatientId_patientMismatch_throwsException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(proposedPlan));

            assertThatThrownBy(() -> treatmentPlanService.getTreatmentPlanByIdAndPatientId(PLAN_ID, 999L))
                    .isInstanceOf(PatientMismatchException.class);
        }

        @Test
        @DisplayName("getTreatmentPlansByPatientId returns list")
        void getTreatmentPlansByPatientId_returnsList() {
            when(treatmentPlanRepository.findByPatientIdOrderByCreatedAtDescIdDesc(PATIENT_ID))
                    .thenReturn(List.of(proposedPlan));

            List<TreatmentPlanResponse> list = treatmentPlanService.getTreatmentPlansByPatientId(PATIENT_ID);

            assertThat(list).hasSize(1);
            assertThat(list.get(0).patientId()).isEqualTo(PATIENT_ID);
        }

        @Test
        @DisplayName("getTreatmentPlansByDentistId returns list")
        void getTreatmentPlansByDentistId_returnsList() {
            when(treatmentPlanRepository.findByDentistIdOrderByCreatedAtDescIdDesc(DENTIST_ID))
                    .thenReturn(List.of(proposedPlan));

            List<TreatmentPlanResponse> list = treatmentPlanService.getTreatmentPlansByDentistId(DENTIST_ID);

            assertThat(list).hasSize(1);
            assertThat(list.get(0).dentistId()).isEqualTo(DENTIST_ID);
        }

        @Test
        @DisplayName("getTreatmentPlansByExaminationId returns list")
        void getTreatmentPlansByExaminationId_returnsList() {
            when(treatmentPlanRepository.findByExaminationId(EXAM_ID))
                    .thenReturn(List.of(proposedPlan));

            List<TreatmentPlanResponse> list = treatmentPlanService.getTreatmentPlansByExaminationId(EXAM_ID);

            assertThat(list).hasSize(1);
            assertThat(list.get(0).examinationId()).isEqualTo(EXAM_ID);
        }
    }
}
