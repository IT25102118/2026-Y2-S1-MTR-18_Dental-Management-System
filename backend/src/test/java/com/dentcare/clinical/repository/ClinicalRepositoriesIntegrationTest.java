package com.dentcare.clinical.repository;

import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ClinicalProgressNote;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.ToothFinding;
import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import com.dentcare.clinical.entity.TreatmentProcedure;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-auth.sql,classpath:schema-clinical.sql")
class ClinicalRepositoriesIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClinicalExaminationRepository examinationRepository;

    @Autowired
    private ToothFindingRepository toothFindingRepository;

    @Autowired
    private TreatmentPlanRepository treatmentPlanRepository;

    @Autowired
    private TreatmentProcedureRepository procedureRepository;

    @Autowired
    private ClinicalProgressNoteRepository progressNoteRepository;

    private Long patientId;
    private Long dentistId;
    private Long assistantId;

    @BeforeEach
    void setUp() {
        User patient = new User("patient.test@dentcare.com", "hash", "Alice", "Brown", "0771234567", Role.PATIENT);
        patient = userRepository.saveAndFlush(patient);
        patientId = patient.getId();

        User dentist = new User("dentist.test@dentcare.com", "hash", "Dr. David", "Lee", "0772345678", Role.DENTIST);
        dentist = userRepository.saveAndFlush(dentist);
        dentistId = dentist.getId();

        User assistant = new User("assistant.test@dentcare.com", "hash", "Sarah", "Miller", "0773456789", Role.DENTAL_ASSISTANT);
        assistant = userRepository.saveAndFlush(assistant);
        assistantId = assistant.getId();
    }

    @Test
    @DisplayName("ClinicalExamination: Persist and query by patient and dentist")
    void testClinicalExaminationRepository() {
        ClinicalExamination exam = new ClinicalExamination(patientId, dentistId, assistantId,
                LocalDate.of(2026, 9, 15), "Severe lower molar sensitivity");
        exam.setClinicalObservations("Visible caries on lower right molar");
        exam.setProvisionalDiagnosis("Dental Caries");

        ClinicalExamination saved = examinationRepository.saveAndFlush(exam);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(ExaminationStatus.DRAFT);
        assertThat(saved.isDiagnosisConfirmed()).isFalse();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        List<ClinicalExamination> patientExams = examinationRepository.findByPatientIdOrderByExaminationDateDescIdDesc(patientId);
        assertThat(patientExams).hasSize(1);
        assertThat(patientExams.get(0).getChiefComplaint()).isEqualTo("Severe lower molar sensitivity");

        List<ClinicalExamination> dentistExams = examinationRepository.findByDentistIdOrderByExaminationDateDescIdDesc(dentistId);
        assertThat(dentistExams).hasSize(1);
    }

    @Test
    @DisplayName("ToothFinding: Persist tooth-specific and general findings")
    void testToothFindingRepository() {
        ClinicalExamination exam = examinationRepository.saveAndFlush(
                new ClinicalExamination(patientId, dentistId, dentistId, LocalDate.now(), "Routine checkup")
        );

        ToothFinding toothFinding = new ToothFinding(exam.getId(), 46, false, "Dental Caries", "Occlusal pit caries", dentistId);
        ToothFinding generalFinding = new ToothFinding(exam.getId(), null, true, "Gingivitis", "Mild generalized bleeding", dentistId);

        toothFindingRepository.saveAndFlush(toothFinding);
        toothFindingRepository.saveAndFlush(generalFinding);

        List<ToothFinding> allFindings = toothFindingRepository.findByExaminationId(exam.getId());
        assertThat(allFindings).hasSize(2);

        List<ToothFinding> tooth46Findings = toothFindingRepository.findByExaminationIdAndToothNumber(exam.getId(), 46);
        assertThat(tooth46Findings).hasSize(1);
        assertThat(tooth46Findings.get(0).getConditionName()).isEqualTo("Dental Caries");

        List<ToothFinding> generalOnly = toothFindingRepository.findByExaminationIdAndIsGeneralTrue(exam.getId());
        assertThat(generalOnly).hasSize(1);
        assertThat(generalOnly.get(0).getToothNumber()).isNull();
        assertThat(generalOnly.get(0).getConditionName()).isEqualTo("Gingivitis");
    }

    @Test
    @DisplayName("TreatmentPlan: Persist with costs and query by patient")
    void testTreatmentPlanRepository() {
        TreatmentPlan plan = new TreatmentPlan(patientId, dentistId, null, dentistId, "Restorative Plan Q3 2026");
        plan.setTotalEstimatedCost(new BigDecimal("150.00"));
        plan.setTotalActualCost(BigDecimal.ZERO);

        TreatmentPlan saved = treatmentPlanRepository.saveAndFlush(plan);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(TreatmentPlanStatus.PROPOSED);
        assertThat(saved.getTotalEstimatedCost()).isEqualByComparingTo("150.00");
        assertThat(saved.getVersion()).isNotNull();

        List<TreatmentPlan> plans = treatmentPlanRepository.findByPatientIdOrderByCreatedAtDescIdDesc(patientId);
        assertThat(plans).hasSize(1);

        Optional<TreatmentPlan> found = treatmentPlanRepository.findByIdAndPatientId(saved.getId(), patientId);
        assertThat(found).isPresent();
    }

    @Test
    @DisplayName("TreatmentProcedure: Persist procedures, verify sequence ordering and counts")
    void testTreatmentProcedureRepository() {
        TreatmentPlan plan = treatmentPlanRepository.saveAndFlush(
                new TreatmentPlan(patientId, dentistId, null, dentistId, "Root Canal & Crown")
        );

        TreatmentProcedure proc1 = new TreatmentProcedure(plan.getId(), 46, "Endodontic Access & Cleaning",
                new BigDecimal("200.00"), 1);
        TreatmentProcedure proc2 = new TreatmentProcedure(plan.getId(), 46, "Obturation & Seal",
                new BigDecimal("150.00"), 2);
        TreatmentProcedure proc3 = new TreatmentProcedure(plan.getId(), 46, "Crown Placement",
                new BigDecimal("350.00"), 3);

        procedureRepository.saveAndFlush(proc1);
        procedureRepository.saveAndFlush(proc2);
        procedureRepository.saveAndFlush(proc3);

        List<TreatmentProcedure> procedures = procedureRepository.findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(plan.getId());
        assertThat(procedures).hasSize(3);
        assertThat(procedures.get(0).getSequenceNumber()).isEqualTo(1);
        assertThat(procedures.get(1).getSequenceNumber()).isEqualTo(2);
        assertThat(procedures.get(2).getSequenceNumber()).isEqualTo(3);

        long totalCount = procedureRepository.countByTreatmentPlanId(plan.getId());
        assertThat(totalCount).isEqualTo(3);

        long plannedCount = procedureRepository.countByTreatmentPlanIdAndStatus(plan.getId(), ProcedureStatus.PLANNED);
        assertThat(plannedCount).isEqualTo(3);
    }

    @Test
    @DisplayName("ClinicalProgressNote: Persist progress notes and query by plan")
    void testClinicalProgressNoteRepository() {
        TreatmentPlan plan = treatmentPlanRepository.saveAndFlush(
                new TreatmentPlan(patientId, dentistId, null, dentistId, "General Treatment Plan")
        );

        ClinicalProgressNote note1 = new ClinicalProgressNote(plan.getId(), null, dentistId,
                "Patient tolerated procedure well. Mild postoperative tenderness expected.", LocalDate.now().plusDays(7));

        progressNoteRepository.saveAndFlush(note1);

        List<ClinicalProgressNote> notes = progressNoteRepository.findByTreatmentPlanIdOrderByNoteTimestampDescIdDesc(plan.getId());
        assertThat(notes).hasSize(1);
        assertThat(notes.get(0).getNoteContent()).contains("tolerated procedure well");
        assertThat(notes.get(0).getFollowUpDate()).isNotNull();
    }
}
