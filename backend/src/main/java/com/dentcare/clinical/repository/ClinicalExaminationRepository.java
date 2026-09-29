package com.dentcare.clinical.repository;

import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ExaminationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link ClinicalExamination} entity.
 */
@Repository
public interface ClinicalExaminationRepository extends JpaRepository<ClinicalExamination, Long> {

    /**
     * Finds all clinical examinations for a specific patient in reverse chronological order.
     */
    List<ClinicalExamination> findByPatientIdOrderByExaminationDateDescIdDesc(Long patientId);

    /**
     * Finds all clinical examinations for a specific dentist in reverse chronological order.
     */
    List<ClinicalExamination> findByDentistIdOrderByExaminationDateDescIdDesc(Long dentistId);

    /**
     * Finds all clinical examinations matching the given status.
     */
    List<ClinicalExamination> findByStatus(ExaminationStatus status);

    /**
     * Finds all clinical examinations for a patient filtered by status.
     */
    List<ClinicalExamination> findByPatientIdAndStatus(Long patientId, ExaminationStatus status);

    /**
     * Finds an examination by ID and patient ID to prevent cross-tenant/patient access.
     */
    Optional<ClinicalExamination> findByIdAndPatientId(Long id, Long patientId);
}
