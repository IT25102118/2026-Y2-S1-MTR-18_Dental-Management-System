package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.AddToothFindingRequest;
import com.dentcare.clinical.dto.ToothFindingResponse;
import com.dentcare.clinical.dto.UpdateToothFindingRequest;
import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.entity.ToothFinding;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidToothNumberException;
import com.dentcare.clinical.exception.ToothFindingNotFoundException;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.clinical.repository.ToothFindingRepository;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ToothFindingServiceTest {

    @Mock
    private ToothFindingRepository toothFindingRepository;

    @Mock
    private ClinicalExaminationRepository examinationRepository;

    @InjectMocks
    private ToothFindingServiceImpl toothFindingService;

    private static final Long EXAM_ID = 501L;
    private static final Long FINDING_ID = 701L;
    private static final Long RECORDER_ID = 303L;

    private ClinicalExamination draftExam;
    private ToothFinding sampleFinding;

    @BeforeEach
    void setUp() {
        draftExam = new ClinicalExamination(
                101L,
                202L,
                RECORDER_ID,
                LocalDate.now(),
                "Routine checkup"
        );
        draftExam.setId(EXAM_ID);
        draftExam.setStatus(ExaminationStatus.DRAFT);

        sampleFinding = new ToothFinding(
                EXAM_ID,
                16,
                false,
                "Dental Caries",
                "Occlusal surface lesion",
                RECORDER_ID
        );
        sampleFinding.setId(FINDING_ID);
    }

    @Nested
    @DisplayName("1. Tooth & FDI Notation Validation Tests")
    class FdiValidationTests {

        @ParameterizedTest(name = "Permanent tooth {0} is accepted")
        @ValueSource(ints = {11, 18, 21, 28, 31, 38, 41, 48})
        @DisplayName("Test 8: Valid permanent FDI tooth numbers are accepted")
        void addToothFinding_validPermanentTeeth_createsFinding(int toothNumber) {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(toothFindingRepository.save(any(ToothFinding.class))).thenAnswer(invocation -> {
                ToothFinding f = invocation.getArgument(0);
                f.setId(FINDING_ID);
                return f;
            });

            AddToothFindingRequest request = new AddToothFindingRequest(
                    toothNumber, false, "Enamel Caries", "Pits and fissures", RECORDER_ID
            );

            ToothFindingResponse response = toothFindingService.addToothFinding(EXAM_ID, request);

            assertThat(response).isNotNull();
            assertThat(response.toothNumber()).isEqualTo(toothNumber);
            assertThat(response.isGeneral()).isFalse();
            assertThat(response.conditionName()).isEqualTo("Enamel Caries");
            verify(toothFindingRepository).save(any(ToothFinding.class));
        }

        @ParameterizedTest(name = "Primary tooth {0} is accepted")
        @ValueSource(ints = {51, 55, 61, 65, 71, 75, 81, 85})
        @DisplayName("Test 9: Valid primary/deciduous FDI tooth numbers are accepted")
        void addToothFinding_validPrimaryTeeth_createsFinding(int toothNumber) {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(toothFindingRepository.save(any(ToothFinding.class))).thenAnswer(invocation -> {
                ToothFinding f = invocation.getArgument(0);
                f.setId(FINDING_ID);
                return f;
            });

            AddToothFindingRequest request = new AddToothFindingRequest(
                    toothNumber, false, "Primary Caries", "Deciduous molar", RECORDER_ID
            );

            ToothFindingResponse response = toothFindingService.addToothFinding(EXAM_ID, request);

            assertThat(response).isNotNull();
            assertThat(response.toothNumber()).isEqualTo(toothNumber);
            assertThat(response.isGeneral()).isFalse();
            verify(toothFindingRepository).save(any(ToothFinding.class));
        }

        @ParameterizedTest(name = "Invalid tooth {0} is rejected")
        @ValueSource(ints = {19, 29, 39, 49, 50, 56, 66, 76, 86, 91, 0, -1, 100})
        @DisplayName("Test 10: Invalid FDI tooth numbers are rejected with InvalidToothNumberException")
        void addToothFinding_invalidFdiNumber_throwsException(int invalidTooth) {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            AddToothFindingRequest request = new AddToothFindingRequest(
                    invalidTooth, false, "Caries", null, RECORDER_ID
            );

            assertThatThrownBy(() -> toothFindingService.addToothFinding(EXAM_ID, request))
                    .isInstanceOf(InvalidToothNumberException.class)
                    .hasMessageContaining("Invalid FDI tooth number: " + invalidTooth);
            verify(toothFindingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 11: General oral cavity finding accepts null tooth number")
        void addToothFinding_generalOralCavityWithNullTooth_createsFinding() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(toothFindingRepository.save(any(ToothFinding.class))).thenAnswer(invocation -> {
                ToothFinding f = invocation.getArgument(0);
                f.setId(FINDING_ID);
                return f;
            });

            AddToothFindingRequest request = new AddToothFindingRequest(
                    null, true, "Generalized Gingivitis", "Marginal gingiva inflamed", RECORDER_ID
            );

            ToothFindingResponse response = toothFindingService.addToothFinding(EXAM_ID, request);

            assertThat(response).isNotNull();
            assertThat(response.isGeneral()).isTrue();
            assertThat(response.toothNumber()).isNull();
            assertThat(response.conditionName()).isEqualTo("Generalized Gingivitis");
            verify(toothFindingRepository).save(any(ToothFinding.class));
        }

        @Test
        @DisplayName("General finding with specified tooth number is rejected")
        void addToothFinding_generalOralCavityWithToothNumber_throwsException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            AddToothFindingRequest request = new AddToothFindingRequest(
                    11, true, "Generalized Gingivitis", null, RECORDER_ID
            );

            assertThatThrownBy(() -> toothFindingService.addToothFinding(EXAM_ID, request))
                    .isInstanceOf(InvalidToothNumberException.class)
                    .hasMessageContaining("General oral cavity findings must not specify a tooth number");
            verify(toothFindingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Test 12: Non-general tooth finding with null tooth number is rejected")
        void addToothFinding_nullToothNumberNonGeneral_throwsException() {
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            AddToothFindingRequest request = new AddToothFindingRequest(
                    null, false, "Caries", null, RECORDER_ID
            );

            assertThatThrownBy(() -> toothFindingService.addToothFinding(EXAM_ID, request))
                    .isInstanceOf(InvalidToothNumberException.class)
                    .hasMessageContaining("Tooth number is required when finding is not general");
            verify(toothFindingRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("2. Examination Association & Ownership Tests")
    class ExaminationAssociationTests {

        @Test
        @DisplayName("Test 6: Tooth finding cannot be attached to a non-existent examination")
        void addToothFinding_nonexistentExamination_throwsException() {
            when(examinationRepository.findById(999L)).thenReturn(Optional.empty());

            AddToothFindingRequest request = new AddToothFindingRequest(
                    16, false, "Caries", null, RECORDER_ID
            );

            assertThatThrownBy(() -> toothFindingService.addToothFinding(999L, request))
                    .isInstanceOf(ClinicalExaminationNotFoundException.class)
                    .hasMessageContaining("999");
            verify(toothFindingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Finding cannot be added to a COMPLETED examination")
        void addToothFinding_completedExamination_throwsException() {
            draftExam.setStatus(ExaminationStatus.COMPLETED);
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            AddToothFindingRequest request = new AddToothFindingRequest(
                    16, false, "Caries", null, RECORDER_ID
            );

            assertThatThrownBy(() -> toothFindingService.addToothFinding(EXAM_ID, request))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Cannot add tooth findings to an examination with status: COMPLETED");
            verify(toothFindingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Finding cannot be added to a CANCELLED examination")
        void addToothFinding_cancelledExamination_throwsException() {
            draftExam.setStatus(ExaminationStatus.CANCELLED);
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            AddToothFindingRequest request = new AddToothFindingRequest(
                    16, false, "Caries", null, RECORDER_ID
            );

            assertThatThrownBy(() -> toothFindingService.addToothFinding(EXAM_ID, request))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Cannot add tooth findings to an examination with status: CANCELLED");
            verify(toothFindingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Cross-examination lookup is rejected when finding does not belong to examination")
        void getToothFindingByIdAndExaminationId_examinationMismatch_throwsException() {
            when(toothFindingRepository.findById(FINDING_ID)).thenReturn(Optional.of(sampleFinding));

            Long wrongExamId = 888L;

            assertThatThrownBy(() -> toothFindingService.getToothFindingByIdAndExaminationId(FINDING_ID, wrongExamId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("does not belong to examination 888");
        }

        @Test
        @DisplayName("Finding belonging to COMPLETED examination cannot be updated")
        void updateToothFinding_completedExam_throwsException() {
            draftExam.setStatus(ExaminationStatus.COMPLETED);
            when(toothFindingRepository.findById(FINDING_ID)).thenReturn(Optional.of(sampleFinding));
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));

            UpdateToothFindingRequest request = new UpdateToothFindingRequest(
                    16, false, "Updated condition", null
            );

            assertThatThrownBy(() -> toothFindingService.updateToothFinding(FINDING_ID, request))
                    .isInstanceOf(InvalidClinicalExaminationStateException.class)
                    .hasMessageContaining("Cannot update tooth finding for an examination with status: COMPLETED");
            verify(toothFindingRepository, never()).save(any());
        }

        @Test
        @DisplayName("Updating tooth finding in draft examination succeeds")
        void updateToothFinding_draftExam_updatesSuccessfully() {
            when(toothFindingRepository.findById(FINDING_ID)).thenReturn(Optional.of(sampleFinding));
            when(examinationRepository.findById(EXAM_ID)).thenReturn(Optional.of(draftExam));
            when(toothFindingRepository.save(any(ToothFinding.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UpdateToothFindingRequest request = new UpdateToothFindingRequest(
                    26, false, "Deep Caries", "Cavitation extended into dentin"
            );

            ToothFindingResponse response = toothFindingService.updateToothFinding(FINDING_ID, request);

            assertThat(response.toothNumber()).isEqualTo(26);
            assertThat(response.conditionName()).isEqualTo("Deep Caries");
            assertThat(response.notes()).isEqualTo("Cavitation extended into dentin");
            verify(toothFindingRepository).save(sampleFinding);
        }
    }

    @Nested
    @DisplayName("3. Query Tests")
    class QueryTests {

        @Test
        @DisplayName("Retrieves tooth finding by ID")
        void getToothFindingById_existing_returnsResponse() {
            when(toothFindingRepository.findById(FINDING_ID)).thenReturn(Optional.of(sampleFinding));

            ToothFindingResponse response = toothFindingService.getToothFindingById(FINDING_ID);

            assertThat(response.id()).isEqualTo(FINDING_ID);
        }

        @Test
        @DisplayName("Throws ToothFindingNotFoundException for non-existent finding")
        void getToothFindingById_nonexistent_throwsException() {
            when(toothFindingRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> toothFindingService.getToothFindingById(999L))
                    .isInstanceOf(ToothFindingNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("Retrieves all findings for an examination")
        void getToothFindingsByExaminationId_returnsList() {
            when(examinationRepository.existsById(EXAM_ID)).thenReturn(true);
            when(toothFindingRepository.findByExaminationId(EXAM_ID)).thenReturn(List.of(sampleFinding));

            List<ToothFindingResponse> responses = toothFindingService.getToothFindingsByExaminationId(EXAM_ID);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).id()).isEqualTo(FINDING_ID);
        }

        @Test
        @DisplayName("Retrieves findings by tooth number")
        void getToothFindingsByTooth_validTooth_returnsList() {
            when(examinationRepository.existsById(EXAM_ID)).thenReturn(true);
            when(toothFindingRepository.findByExaminationIdAndToothNumber(EXAM_ID, 16)).thenReturn(List.of(sampleFinding));

            List<ToothFindingResponse> responses = toothFindingService.getToothFindingsByTooth(EXAM_ID, 16);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).toothNumber()).isEqualTo(16);
        }

        @Test
        @DisplayName("Querying by invalid tooth number throws InvalidToothNumberException")
        void getToothFindingsByTooth_invalidTooth_throwsException() {
            when(examinationRepository.existsById(EXAM_ID)).thenReturn(true);

            assertThatThrownBy(() -> toothFindingService.getToothFindingsByTooth(EXAM_ID, 99))
                    .isInstanceOf(InvalidToothNumberException.class)
                    .hasMessageContaining("Invalid FDI tooth number: 99");
        }
    }
}
