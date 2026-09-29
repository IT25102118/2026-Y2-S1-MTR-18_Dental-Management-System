package com.dentcare.clinical.repository;

import com.dentcare.clinical.entity.ToothFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link ToothFinding} entity.
 */
@Repository
public interface ToothFindingRepository extends JpaRepository<ToothFinding, Long> {

    /**
     * Finds all tooth and oral findings recorded for a specific clinical examination.
     */
    List<ToothFinding> findByExaminationId(Long examinationId);

    /**
     * Finds all findings recorded for a specific tooth in a given examination.
     */
    List<ToothFinding> findByExaminationIdAndToothNumber(Long examinationId, Integer toothNumber);

    /**
     * Finds all generalized oral cavity findings recorded in a given examination.
     */
    List<ToothFinding> findByExaminationIdAndIsGeneralTrue(Long examinationId);
}
