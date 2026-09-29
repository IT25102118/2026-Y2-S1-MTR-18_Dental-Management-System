package com.dentcare.clinical.repository;

import com.dentcare.clinical.entity.ClinicalProgressNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link ClinicalProgressNote} entity.
 */
@Repository
public interface ClinicalProgressNoteRepository extends JpaRepository<ClinicalProgressNote, Long> {

    /**
     * Finds all progress notes for a treatment plan in reverse chronological order.
     */
    List<ClinicalProgressNote> findByTreatmentPlanIdOrderByNoteTimestampDescIdDesc(Long treatmentPlanId);

    /**
     * Finds all progress notes linked to a specific procedure in reverse chronological order.
     */
    List<ClinicalProgressNote> findByTreatmentProcedureIdOrderByNoteTimestampDescIdDesc(Long treatmentProcedureId);
}
