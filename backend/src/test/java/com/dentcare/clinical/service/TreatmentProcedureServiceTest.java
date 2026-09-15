package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.AddTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CancelTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CompleteTreatmentProcedureRequest;
import com.dentcare.clinical.dto.TreatmentProcedureResponse;
import com.dentcare.clinical.dto.UpdateTreatmentProcedureRequest;
import com.dentcare.clinical.entity.ClinicalProgressNote;
import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import com.dentcare.clinical.entity.TreatmentProcedure;
import com.dentcare.clinical.exception.InvalidToothNumberException;
import com.dentcare.clinical.exception.InvalidTreatmentPlanStateException;
import com.dentcare.clinical.exception.InvalidTreatmentProcedureStateException;
import com.dentcare.clinical.exception.TreatmentPlanNotFoundException;
import com.dentcare.clinical.exception.TreatmentProcedureNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
class TreatmentProcedureServiceTest {

    @Mock
    private TreatmentProcedureRepository treatmentProcedureRepository;

    @Mock
    private TreatmentPlanRepository treatmentPlanRepository;

    @Mock
    private ClinicalProgressNoteRepository clinicalProgressNoteRepository;

    @Mock
    private DentistLookupPort dentistLookupPort;

    @Mock
    private CurrentDentistProvider currentDentistProvider;

    @InjectMocks
    private TreatmentProcedureServiceImpl procedureService;

    private static final Long PLAN_ID = 601L;
    private static final Long PROC_ID = 801L;
    private static final Long DENTIST_ID = 202L;
    private static final Long ASSISTANT_ID = 404L;

    private TreatmentPlan approvedPlan;
    private TreatmentProcedure plannedProcedure;

    @BeforeEach
    void setUp() {
        lenient().when(currentDentistProvider.getCurrentDentist()).thenReturn(new Dentist(DENTIST_ID));

        approvedPlan = new TreatmentPlan(
                101L,
                DENTIST_ID,
                501L,
                303L,
                "Restorative Treatment Plan"
        );
        approvedPlan.setId(PLAN_ID);
        approvedPlan.setStatus(TreatmentPlanStatus.APPROVED);

        plannedProcedure = new TreatmentProcedure(
                PLAN_ID,
                16,
                "Composite Resin Restoration",
                new BigDecimal("4500.00"),
                1
        );
        plannedProcedure.setId(PROC_ID);
        plannedProcedure.setStatus(ProcedureStatus.PLANNED);
        plannedProcedure.setCreatedAt(LocalDateTime.now().minusDays(1));
    }

    @Nested
    @DisplayName("1. Procedure Creation Tests")
    class CreateProcedureTests {

        @Test
        @DisplayName("Valid procedure creation starts in PLANNED status")
        void addTreatmentProcedure_validRequest_createsProcedureInPlannedStatus() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(invocation -> {
                TreatmentProcedure p = invocation.getArgument(0);
                p.setId(PROC_ID);
                return p;
            });

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16,
                    "Composite Resin Restoration",
                    "D2391",
                    1,
                    new BigDecimal("4500.00"),
                    null,
                    null,
                    "Class II cavity on mesial surface"
            );

            TreatmentProcedureResponse response = procedureService.addTreatmentProcedure(PLAN_ID, request);

            assertThat(response).isNotNull();
            assertThat(response.id()).isEqualTo(PROC_ID);
            assertThat(response.treatmentPlanId()).isEqualTo(PLAN_ID);
            assertThat(response.toothNumber()).isEqualTo(16);
            assertThat(response.status()).isEqualTo(ProcedureStatus.PLANNED);
            assertThat(response.estimatedCost()).isEqualByComparingTo("4500.00");
            verify(treatmentProcedureRepository).save(any(TreatmentProcedure.class));
            verify(treatmentPlanRepository).save(approvedPlan);
        }

        @Test
        @DisplayName("Procedure creation auto-calculates estimated cost from quantity and unitCost")
        void addTreatmentProcedure_withQuantityAndUnitCost_calculatesEstimatedCost() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(invocation -> {
                TreatmentProcedure p = invocation.getArgument(0);
                p.setId(PROC_ID);
                return p;
            });

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16,
                    "Composite Filling",
                    "D2391",
                    1,
                    null,
                    2,
                    new BigDecimal("2500.00"),
                    "Two surfaces"
            );

            TreatmentProcedureResponse response = procedureService.addTreatmentProcedure(PLAN_ID, request);

            assertThat(response.estimatedCost()).isEqualByComparingTo("5000.00");
        }

        @Test
        @DisplayName("Adding procedure to CANCELLED plan throws InvalidTreatmentPlanStateException")
        void addTreatmentProcedure_cancelledPlan_throwsException() {
            approvedPlan.setStatus(TreatmentPlanStatus.CANCELLED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "Extraction", null, 1, new BigDecimal("3000.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("plan must be PROPOSED or APPROVED");
            verify(treatmentProcedureRepository, never()).save(any());
        }

        @Test
        @DisplayName("Adding procedure to COMPLETED plan throws InvalidTreatmentPlanStateException")
        void addTreatmentProcedure_completedPlan_throwsException() {
            approvedPlan.setStatus(TreatmentPlanStatus.COMPLETED);
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "Extraction", null, 1, new BigDecimal("3000.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("plan must be PROPOSED or APPROVED");
            verify(treatmentProcedureRepository, never()).save(any());
        }

        @Test
        @DisplayName("Adding procedure to non-existent plan throws TreatmentPlanNotFoundException")
        void addTreatmentProcedure_nonexistentPlan_throwsException() {
            when(treatmentPlanRepository.findById(999L)).thenReturn(Optional.empty());

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "Extraction", null, 1, new BigDecimal("3000.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(999L, request))
                    .isInstanceOf(TreatmentPlanNotFoundException.class);
        }

        @Test
        @DisplayName("Blank procedure name throws IllegalArgumentException")
        void addTreatmentProcedure_blankName_throwsIllegalArgumentException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "   ", null, 1, new BigDecimal("3000.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Procedure name is required");
        }

        @Test
        @DisplayName("Zero or negative quantity throws IllegalArgumentException")
        void addTreatmentProcedure_invalidQuantity_throwsIllegalArgumentException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "Procedure", null, 1, null, 0, new BigDecimal("100.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Quantity must be greater than zero");
        }

        @Test
        @DisplayName("Negative unit cost throws IllegalArgumentException")
        void addTreatmentProcedure_negativeUnitCost_throwsIllegalArgumentException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "Procedure", null, 1, null, 1, new BigDecimal("-50.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Unit cost cannot be negative");
        }

        @Test
        @DisplayName("Negative estimated cost throws IllegalArgumentException")
        void addTreatmentProcedure_negativeEstimatedCost_throwsIllegalArgumentException() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    16, "Extraction", null, 1, new BigDecimal("-100.00"), null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cannot be negative");
        }

        @Test
        @DisplayName("Null tooth number is allowed for full-mouth/general procedures")
        void addTreatmentProcedure_nullToothNumber_createsGeneralProcedure() {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    null, "Full Mouth Scaling & Polishing", "D1110", 1, new BigDecimal("5000.00"), null
            );

            TreatmentProcedureResponse response = procedureService.addTreatmentProcedure(PLAN_ID, request);

            assertThat(response).isNotNull();
            assertThat(response.toothNumber()).isNull();
            assertThat(response.procedureName()).isEqualTo("Full Mouth Scaling & Polishing");
        }
    }

    @Nested
    @DisplayName("2. FDI Tooth Number Validation Tests")
    class FdiValidationTests {

        @ParameterizedTest
        @ValueSource(ints = {11, 18, 21, 28, 31, 38, 41, 48})
        @DisplayName("Valid permanent FDI teeth accepted")
        void addTreatmentProcedure_validPermanentTeeth_accepted(int tooth) {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    tooth, "Restoration", null, 1, BigDecimal.TEN, null
            );

            TreatmentProcedureResponse response = procedureService.addTreatmentProcedure(PLAN_ID, request);
            assertThat(response.toothNumber()).isEqualTo(tooth);
        }

        @ParameterizedTest
        @ValueSource(ints = {51, 55, 61, 65, 71, 75, 81, 85})
        @DisplayName("Valid primary FDI teeth accepted")
        void addTreatmentProcedure_validPrimaryTeeth_accepted(int tooth) {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    tooth, "Pulpotomy", null, 1, BigDecimal.TEN, null
            );

            TreatmentProcedureResponse response = procedureService.addTreatmentProcedure(PLAN_ID, request);
            assertThat(response.toothNumber()).isEqualTo(tooth);
        }

        @ParameterizedTest
        @ValueSource(ints = {19, 29, 39, 49, 50, 56, 66, 76, 86, 91, 0, -1, 100})
        @DisplayName("Invalid FDI teeth throw InvalidToothNumberException")
        void addTreatmentProcedure_invalidTooth_throwsException(int tooth) {
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            AddTreatmentProcedureRequest request = new AddTreatmentProcedureRequest(
                    tooth, "Invalid Tooth Procedure", null, 1, BigDecimal.TEN, null
            );

            assertThatThrownBy(() -> procedureService.addTreatmentProcedure(PLAN_ID, request))
                    .isInstanceOf(InvalidToothNumberException.class)
                    .hasMessageContaining(String.valueOf(tooth));
        }
    }

    @Nested
    @DisplayName("3. Procedure Lifecycle Transitions")
    class LifecycleTests {

        @Test
        @DisplayName("Valid start transitions procedure PLANNED -> IN_PROGRESS")
        void startTreatmentProcedure_plannedProcedure_transitionsToInProgress() {
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            TreatmentProcedureResponse response = procedureService.startTreatmentProcedure(PROC_ID);

            assertThat(response.status()).isEqualTo(ProcedureStatus.IN_PROGRESS);
            assertThat(approvedPlan.getStatus()).isEqualTo(TreatmentPlanStatus.IN_PROGRESS);
            verify(treatmentPlanRepository).save(approvedPlan);
        }

        @Test
        @DisplayName("Start procedure by unauthenticated caller throws UnauthorizedClinicalOperationException")
        void startTreatmentProcedure_unauthenticatedCaller_throwsUnauthorizedException() {
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("No authenticated user in security context"));

            assertThatThrownBy(() -> procedureService.startTreatmentProcedure(PROC_ID))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("No authenticated user in security context");
        }

        @Test
        @DisplayName("Start procedure under CANCELLED plan throws InvalidTreatmentPlanStateException")
        void startTreatmentProcedure_cancelledPlan_throwsException() {
            approvedPlan.setStatus(TreatmentPlanStatus.CANCELLED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            assertThatThrownBy(() -> procedureService.startTreatmentProcedure(PROC_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("Cannot start procedure under a CANCELLED treatment plan");
        }

        @Test
        @DisplayName("Start procedure under COMPLETED plan throws InvalidTreatmentPlanStateException")
        void startTreatmentProcedure_completedPlan_throwsException() {
            approvedPlan.setStatus(TreatmentPlanStatus.COMPLETED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            assertThatThrownBy(() -> procedureService.startTreatmentProcedure(PROC_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("Cannot start procedure under a COMPLETED treatment plan");
        }

        @Test
        @DisplayName("Start procedure under PROPOSED plan throws InvalidTreatmentPlanStateException")
        void startTreatmentProcedure_proposedPlan_throwsException() {
            approvedPlan.setStatus(TreatmentPlanStatus.PROPOSED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            assertThatThrownBy(() -> procedureService.startTreatmentProcedure(PROC_ID))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("plan must be approved first");
        }

        @Test
        @DisplayName("Cannot start a COMPLETED procedure")
        void startTreatmentProcedure_alreadyCompleted_throwsException() {
            plannedProcedure.setStatus(ProcedureStatus.COMPLETED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            assertThatThrownBy(() -> procedureService.startTreatmentProcedure(PROC_ID))
                    .isInstanceOf(InvalidTreatmentProcedureStateException.class)
                    .hasMessageContaining("Cannot start a completed procedure");
        }

        @Test
        @DisplayName("Valid completion by dentist transitions to COMPLETED and sets actual cost")
        void completeTreatmentProcedure_validDentist_transitionsToCompleted() {
            plannedProcedure.setStatus(ProcedureStatus.IN_PROGRESS);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                    ASSISTANT_ID,
                    LocalDate.now(),
                    new BigDecimal("5000.00"),
                    "Procedure completed successfully"
            );

            TreatmentProcedureResponse response = procedureService.completeTreatmentProcedure(PROC_ID, request);

            assertThat(response.status()).isEqualTo(ProcedureStatus.COMPLETED);
            assertThat(response.performedByDentistId()).isEqualTo(DENTIST_ID);
            assertThat(response.assistedByUserId()).isEqualTo(ASSISTANT_ID);
            assertThat(response.actualCost()).isEqualByComparingTo("5000.00");
            assertThat(response.completionDate()).isEqualTo(LocalDate.now());
            verify(clinicalProgressNoteRepository).save(any(ClinicalProgressNote.class));
            verify(treatmentPlanRepository).save(approvedPlan);
        }

        @Test
        @DisplayName("Completion date before procedure creation date throws IllegalArgumentException")
        void completeTreatmentProcedure_dateBeforeCreation_throwsIllegalArgumentException() {
            plannedProcedure.setStatus(ProcedureStatus.IN_PROGRESS);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                    null,
                    plannedProcedure.getCreatedAt().toLocalDate().minusDays(3),
                    new BigDecimal("5000.00"),
                    "Notes"
            );

            assertThatThrownBy(() -> procedureService.completeTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("cannot be before procedure creation date");
            verify(treatmentProcedureRepository, never()).save(any());
        }

        @Test
        @DisplayName("Completion by inactive or non-dentist throws UnauthorizedClinicalOperationException")
        void completeTreatmentProcedure_inactiveDentist_throwsUnauthorizedException() {
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));
            when(currentDentistProvider.getCurrentDentist())
                    .thenThrow(new UnauthorizedClinicalOperationException("Authenticated user 999 is not an active dentist"));

            CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                    null, LocalDate.now(), BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> procedureService.completeTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(UnauthorizedClinicalOperationException.class)
                    .hasMessageContaining("not an active dentist");
        }

        @Test
        @DisplayName("Cannot complete procedure under CANCELLED plan")
        void completeTreatmentProcedure_cancelledPlan_throwsException() {
            approvedPlan.setStatus(TreatmentPlanStatus.CANCELLED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentPlanRepository.findById(PLAN_ID)).thenReturn(Optional.of(approvedPlan));

            CompleteTreatmentProcedureRequest request = new CompleteTreatmentProcedureRequest(
                    null, LocalDate.now(), BigDecimal.ZERO, null
            );

            assertThatThrownBy(() -> procedureService.completeTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(InvalidTreatmentPlanStateException.class)
                    .hasMessageContaining("Cannot complete procedure under a CANCELLED treatment plan");
        }

        @Test
        @DisplayName("Valid cancellation by dentist transitions to CANCELLED with reason")
        void cancelTreatmentProcedure_validDentistAndReason_transitionsToCancelled() {
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            CancelTreatmentProcedureRequest request = new CancelTreatmentProcedureRequest(
                    "Patient elected extraction instead"
            );

            TreatmentProcedureResponse response = procedureService.cancelTreatmentProcedure(PROC_ID, request);

            assertThat(response.status()).isEqualTo(ProcedureStatus.CANCELLED);
            assertThat(response.cancellationReason()).isEqualTo("Patient elected extraction instead");
            verify(treatmentProcedureRepository).save(plannedProcedure);
        }

        @Test
        @DisplayName("Cancellation of completed procedure throws InvalidTreatmentProcedureStateException")
        void cancelTreatmentProcedure_completedProcedure_throwsException() {
            plannedProcedure.setStatus(ProcedureStatus.COMPLETED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));

            CancelTreatmentProcedureRequest request = new CancelTreatmentProcedureRequest(
                    "Cancelled"
            );

            assertThatThrownBy(() -> procedureService.cancelTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(InvalidTreatmentProcedureStateException.class)
                    .hasMessageContaining("Cannot cancel a completed procedure");
            verify(treatmentProcedureRepository, never()).save(any());
        }

        @Test
        @DisplayName("Cancellation without reason throws IllegalArgumentException")
        void cancelTreatmentProcedure_blankReason_throwsIllegalArgumentException() {
            CancelTreatmentProcedureRequest request = new CancelTreatmentProcedureRequest("   ");

            assertThatThrownBy(() -> procedureService.cancelTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Cancellation reason is required");
        }
    }

    @Nested
    @DisplayName("4. Update Procedure Tests")
    class UpdateProcedureTests {

        @Test
        @DisplayName("Can update procedure in PLANNED status")
        void updateTreatmentProcedure_plannedStatus_updatesSuccessfully() {
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));
            when(treatmentProcedureRepository.save(any(TreatmentProcedure.class))).thenAnswer(i -> i.getArgument(0));

            UpdateTreatmentProcedureRequest request = new UpdateTreatmentProcedureRequest(
                    17, "Updated Procedure", "D2392", 2, new BigDecimal("5500.00"), "Updated notes"
            );

            TreatmentProcedureResponse response = procedureService.updateTreatmentProcedure(PROC_ID, request);

            assertThat(response.toothNumber()).isEqualTo(17);
            assertThat(response.procedureName()).isEqualTo("Updated Procedure");
            assertThat(response.procedureCode()).isEqualTo("D2392");
            assertThat(response.sequenceNumber()).isEqualTo(2);
            assertThat(response.estimatedCost()).isEqualByComparingTo("5500.00");
        }

        @Test
        @DisplayName("Cannot update procedure in COMPLETED status")
        void updateTreatmentProcedure_completedStatus_throwsException() {
            plannedProcedure.setStatus(ProcedureStatus.COMPLETED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));

            UpdateTreatmentProcedureRequest request = new UpdateTreatmentProcedureRequest(
                    null, "New Name", null, null, null, null
            );

            assertThatThrownBy(() -> procedureService.updateTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(InvalidTreatmentProcedureStateException.class)
                    .hasMessageContaining("Cannot update a procedure with status: COMPLETED");
        }

        @Test
        @DisplayName("Cannot update procedure in CANCELLED status")
        void updateTreatmentProcedure_cancelledStatus_throwsException() {
            plannedProcedure.setStatus(ProcedureStatus.CANCELLED);
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));

            UpdateTreatmentProcedureRequest request = new UpdateTreatmentProcedureRequest(
                    null, "New Name", null, null, null, null
            );

            assertThatThrownBy(() -> procedureService.updateTreatmentProcedure(PROC_ID, request))
                    .isInstanceOf(InvalidTreatmentProcedureStateException.class)
                    .hasMessageContaining("Cannot update a procedure with status: CANCELLED");
        }
    }

    @Nested
    @DisplayName("5. Query Tests")
    class QueryTests {

        @Test
        @DisplayName("getTreatmentProcedureById returns response")
        void getTreatmentProcedureById_existing_returnsResponse() {
            when(treatmentProcedureRepository.findById(PROC_ID)).thenReturn(Optional.of(plannedProcedure));

            TreatmentProcedureResponse response = procedureService.getTreatmentProcedureById(PROC_ID);

            assertThat(response.id()).isEqualTo(PROC_ID);
        }

        @Test
        @DisplayName("getTreatmentProcedureById throws exception for non-existent procedure")
        void getTreatmentProcedureById_nonexistent_throwsException() {
            when(treatmentProcedureRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> procedureService.getTreatmentProcedureById(999L))
                    .isInstanceOf(TreatmentProcedureNotFoundException.class);
        }

        @Test
        @DisplayName("getProceduresByTreatmentPlanId returns ordered list")
        void getProceduresByTreatmentPlanId_existingPlan_returnsList() {
            when(treatmentPlanRepository.existsById(PLAN_ID)).thenReturn(true);
            when(treatmentProcedureRepository.findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(PLAN_ID))
                    .thenReturn(List.of(plannedProcedure));

            List<TreatmentProcedureResponse> list = procedureService.getProceduresByTreatmentPlanId(PLAN_ID);

            assertThat(list).hasSize(1);
            assertThat(list.get(0).id()).isEqualTo(PROC_ID);
        }

        @Test
        @DisplayName("getProceduresByTooth returns list for valid tooth")
        void getProceduresByTooth_validTooth_returnsList() {
            when(treatmentPlanRepository.existsById(PLAN_ID)).thenReturn(true);
            when(treatmentProcedureRepository.findByTreatmentPlanIdAndToothNumber(PLAN_ID, 16))
                    .thenReturn(List.of(plannedProcedure));

            List<TreatmentProcedureResponse> list = procedureService.getProceduresByTooth(PLAN_ID, 16);

            assertThat(list).hasSize(1);
            assertThat(list.get(0).toothNumber()).isEqualTo(16);
        }

        @Test
        @DisplayName("getProceduresByTooth throws exception for invalid FDI tooth")
        void getProceduresByTooth_invalidTooth_throwsException() {
            when(treatmentPlanRepository.existsById(PLAN_ID)).thenReturn(true);

            assertThatThrownBy(() -> procedureService.getProceduresByTooth(PLAN_ID, 99))
                    .isInstanceOf(InvalidToothNumberException.class);
        }
    }
}
