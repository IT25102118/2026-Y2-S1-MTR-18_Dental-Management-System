package com.dentcare.clinical.repository;

import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link TreatmentPlan} entity.
 */
@Repository
public interface TreatmentPlanRepository extends JpaRepository<TreatmentPlan, Long> {

    /**
     * Finds all treatment plans for a specific patient in reverse chronological order.
     */
    List<TreatmentPlan> findByPatientIdOrderByCreatedAtDescIdDesc(Long patientId);

    /**
     * Finds all treatment plans managed by a specific dentist in reverse chronological order.
     */
    List<TreatmentPlan> findByDentistIdOrderByCreatedAtDescIdDesc(Long dentistId);

    /**
     * Finds all treatment plans for a patient filtered by status.
     */
    List<TreatmentPlan> findByPatientIdAndStatus(Long patientId, TreatmentPlanStatus status);

    /**
     * Finds all treatment plans originating from a specific clinical examination.
     */
    List<TreatmentPlan> findByExaminationId(Long examinationId);

    /**
     * Finds a treatment plan by ID and patient ID to ensure tenant/patient isolation.
     */
    Optional<TreatmentPlan> findByIdAndPatientId(Long id, Long patientId);
}
