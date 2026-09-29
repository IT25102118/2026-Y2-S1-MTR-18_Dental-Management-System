package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.AddToothFindingRequest;
import com.dentcare.clinical.dto.ToothFindingResponse;
import com.dentcare.clinical.dto.UpdateToothFindingRequest;

import java.util.List;

/**
 * Service interface for managing tooth and general oral cavity findings within clinical examinations.
 */
public interface ToothFindingService {

    /**
     * Records a new tooth or generalized oral cavity finding for an examination in DRAFT status.
     * Enforces FDI two-digit numbering validation for tooth-specific findings
     * and null tooth number for general oral cavity findings.
     */
    ToothFindingResponse addToothFinding(Long examinationId, AddToothFindingRequest request);

    /**
     * Retrieves a tooth finding by its unique ID.
     */
    ToothFindingResponse getToothFindingById(Long id);

    /**
     * Retrieves a tooth finding by its unique ID and verifies that it belongs to the specified examination.
     */
    ToothFindingResponse getToothFindingByIdAndExaminationId(Long id, Long examinationId);

    /**
     * Retrieves all tooth and general oral cavity findings recorded for a specific clinical examination.
     */
    List<ToothFindingResponse> getToothFindingsByExaminationId(Long examinationId);

    /**
     * Retrieves all findings recorded for a specific tooth in a given examination.
     */
    List<ToothFindingResponse> getToothFindingsByTooth(Long examinationId, Integer toothNumber);

    /**
     * Updates an existing tooth finding while the parent examination is in DRAFT status.
     * Findings belonging to a COMPLETED or CANCELLED examination cannot be modified.
     */
    ToothFindingResponse updateToothFinding(Long id, UpdateToothFindingRequest request);
}
