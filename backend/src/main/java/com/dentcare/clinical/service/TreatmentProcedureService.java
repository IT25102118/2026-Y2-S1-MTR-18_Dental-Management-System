package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.AddTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CancelTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CompleteTreatmentProcedureRequest;
import com.dentcare.clinical.dto.TreatmentProcedureResponse;
import com.dentcare.clinical.dto.UpdateTreatmentProcedureRequest;

import java.util.List;

/**
 * Service interface for treatment procedure lifecycle, tooth notation validation,
 * sequence numbering, procedure execution, and cost tracking.
 */
public interface TreatmentProcedureService {

    /**
     * Adds an individual procedure to a treatment plan.
     * Parent plan must be in PROPOSED or APPROVED status.
     * Enforces FDI tooth numbering and cost/quantity validation.
     */
    TreatmentProcedureResponse addTreatmentProcedure(Long treatmentPlanId, AddTreatmentProcedureRequest request);

    /**
     * Retrieves a procedure by its unique ID.
     */
    TreatmentProcedureResponse getTreatmentProcedureById(Long id);

    /**
     * Retrieves all procedures belonging to a treatment plan, ordered by sequence number.
     */
    List<TreatmentProcedureResponse> getProceduresByTreatmentPlanId(Long treatmentPlanId);

    /**
     * Retrieves all procedures belonging to a treatment plan associated with a specific tooth.
     */
    List<TreatmentProcedureResponse> getProceduresByTooth(Long treatmentPlanId, Integer toothNumber);

    /**
     * Updates procedure details while in PLANNED or IN_PROGRESS status.
     * Rejects updates once COMPLETED or CANCELLED.
     */
    TreatmentProcedureResponse updateTreatmentProcedure(Long id, UpdateTreatmentProcedureRequest request);

    /**
     * Starts execution of a planned procedure (PLANNED -> IN_PROGRESS).
     * Verifies that the parent plan is not CANCELLED or COMPLETED, and is not PROPOSED.
     */
    TreatmentProcedureResponse startTreatmentProcedure(Long id, Long dentistId);

    /**
     * Overload for starting treatment procedure.
     */
    TreatmentProcedureResponse startTreatmentProcedure(Long id);

    /**
     * Completes an in-progress procedure (IN_PROGRESS -> COMPLETED).
     * Dentist-only; requires completion date and responsible dentist.
     * Completion date cannot be before procedure creation date.
     * Cannot complete a procedure under a CANCELLED plan.
     */
    TreatmentProcedureResponse completeTreatmentProcedure(Long id, CompleteTreatmentProcedureRequest request);

    /**
     * Cancels a planned or in-progress procedure (PLANNED|IN_PROGRESS -> CANCELLED).
     * Cancellation is dentist-only and requires a cancellation reason.
     * Completed procedures cannot be cancelled.
     */
    TreatmentProcedureResponse cancelTreatmentProcedure(Long id, CancelTreatmentProcedureRequest request);

    /**
     * Overload for cancelling a treatment procedure.
     */
    TreatmentProcedureResponse cancelTreatmentProcedure(Long id, String cancellationReason);
}
