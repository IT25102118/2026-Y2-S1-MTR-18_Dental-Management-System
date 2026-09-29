package com.dentcare.clinical.repository;

import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.TreatmentProcedure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link TreatmentProcedure} entity.
 */
@Repository
public interface TreatmentProcedureRepository extends JpaRepository<TreatmentProcedure, Long> {

    /**
     * Finds all planned/executed procedures under a treatment plan, ordered by sequence number.
     */
    List<TreatmentProcedure> findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(Long treatmentPlanId);

    /**
     * Finds all procedures under a treatment plan matching a specific status.
     */
    List<TreatmentProcedure> findByTreatmentPlanIdAndStatus(Long treatmentPlanId, ProcedureStatus status);

    /**
     * Finds all procedures under a treatment plan associated with a specific tooth number.
     */
    List<TreatmentProcedure> findByTreatmentPlanIdAndToothNumber(Long treatmentPlanId, Integer toothNumber);

    /**
     * Counts the total number of procedures belonging to a treatment plan.
     */
    long countByTreatmentPlanId(Long treatmentPlanId);

    /**
     * Counts the number of procedures belonging to a treatment plan with a specific status.
     */
    long countByTreatmentPlanIdAndStatus(Long treatmentPlanId, ProcedureStatus status);
}
