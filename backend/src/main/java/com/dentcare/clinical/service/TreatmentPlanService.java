package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.ApproveTreatmentPlanRequest;
import com.dentcare.clinical.dto.CancelTreatmentPlanRequest;
import com.dentcare.clinical.dto.CreateTreatmentPlanRequest;
import com.dentcare.clinical.dto.FollowUpRequest;
import com.dentcare.clinical.dto.TreatmentPlanResponse;
import com.dentcare.clinical.dto.UpdateTreatmentPlanRequest;

import java.util.List;

/**
 * Service interface for treatment plan lifecycle management, clinical examination association,
 * dentist approval, stage transitions, and financial tracking.
 */
public interface TreatmentPlanService {

    /**
     * Creates a new treatment plan in PROPOSED status.
     * Verifies that the referenced patient and dentist are existing, active users with valid roles,
     * and that any referenced clinical examination belongs to the same patient and is not cancelled.
     */
    TreatmentPlanResponse createTreatmentPlan(CreateTreatmentPlanRequest request);

    /**
     * Retrieves a treatment plan by its unique ID.
     */
    TreatmentPlanResponse getTreatmentPlanById(Long id);

    /**
     * Retrieves a treatment plan by ID scoped to a specific patient to verify ownership.
     */
    TreatmentPlanResponse getTreatmentPlanByIdAndPatientId(Long id, Long patientId);

    /**
     * Retrieves all treatment plans for a specific patient in reverse chronological order.
     */
    List<TreatmentPlanResponse> getTreatmentPlansByPatientId(Long patientId);

    /**
     * Retrieves all treatment plans managed by a specific dentist in reverse chronological order.
     */
    List<TreatmentPlanResponse> getTreatmentPlansByDentistId(Long dentistId);

    /**
     * Retrieves all treatment plans associated with a specific clinical examination.
     */
    List<TreatmentPlanResponse> getTreatmentPlansByExaminationId(Long examinationId);

    /**
     * Updates an existing treatment plan while in PROPOSED or APPROVED status.
     * Rejects edits after IN_PROGRESS, COMPLETED, or CANCELLED.
     */
    TreatmentPlanResponse updateTreatmentPlan(Long id, UpdateTreatmentPlanRequest request);

    /**
     * Updates an existing treatment plan while verifying patient ownership.
     */
    TreatmentPlanResponse updateTreatmentPlan(Long id, Long patientId, UpdateTreatmentPlanRequest request);

    /**
     * Approves a proposed treatment plan by an authorized, active dentist.
     * Transitions status from PROPOSED to APPROVED.
     * Requires at least one valid procedure.
     */
    TreatmentPlanResponse approveTreatmentPlan(Long id, ApproveTreatmentPlanRequest request);

    /**
     * Starts execution of an approved treatment plan by an authorized dentist.
     * Transitions status from APPROVED to IN_PROGRESS.
     */
    TreatmentPlanResponse startTreatmentPlan(Long id, Long dentistId);

    /**
     * Overload for starting treatment plan.
     */
    TreatmentPlanResponse startTreatmentPlan(Long id);

    /**
     * Completes an in-progress treatment plan after verifying that all procedures are resolved
     * (completed or cancelled), at least one is completed, and completion info is present.
     * Transitions status from IN_PROGRESS to COMPLETED.
     */
    TreatmentPlanResponse completeTreatmentPlan(Long id, Long dentistId);

    /**
     * Overload for completing treatment plan.
     */
    TreatmentPlanResponse completeTreatmentPlan(Long id);

    /**
     * Cancels a treatment plan while preserving historical audit records.
     * Cancellation is dentist-only and requires a cancellation reason.
     * Completed treatment plans cannot be cancelled.
     */
    TreatmentPlanResponse cancelTreatmentPlan(Long id, CancelTreatmentPlanRequest request);

    /**
     * Overload for cancelling a treatment plan.
     */
    TreatmentPlanResponse cancelTreatmentPlan(Long id, String cancellationReason);

    /**
     * Sets a follow-up appointment date for a treatment plan.
     * Follow-up date cannot be before the relevant treatment / creation date.
     * Records a clinical progress note.
     */
    TreatmentPlanResponse setFollowUpDate(Long id, FollowUpRequest request);
}
