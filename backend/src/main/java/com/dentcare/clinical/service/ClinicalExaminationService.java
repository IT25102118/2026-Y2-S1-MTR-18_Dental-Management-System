package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.ClinicalExaminationResponse;
import com.dentcare.clinical.dto.ConfirmDiagnosisRequest;
import com.dentcare.clinical.dto.CreateClinicalExaminationRequest;
import com.dentcare.clinical.dto.UpdateClinicalExaminationRequest;

import java.util.List;

/**
 * Service interface for clinical examination lifecycle, patient ownership, and diagnosis operations.
 */
public interface ClinicalExaminationService {

    /**
     * Creates a new clinical examination in DRAFT status.
     * Verifies that the referenced patient and dentist are existing, active users with valid roles.
     */
    ClinicalExaminationResponse createDraftExamination(CreateClinicalExaminationRequest request);

    /**
     * Retrieves an examination by its primary key identifier.
     */
    ClinicalExaminationResponse getExaminationById(Long id);

    /**
     * Retrieves an examination by ID scoped to a specific patient to enforce patient ownership and isolation.
     */
    ClinicalExaminationResponse getExaminationByIdAndPatientId(Long id, Long patientId);

    /**
     * Retrieves all clinical examinations for a specific patient in reverse chronological order.
     */
    List<ClinicalExaminationResponse> getExaminationsByPatientId(Long patientId);

    /**
     * Retrieves all clinical examinations conducted by a specific dentist in reverse chronological order.
     */
    List<ClinicalExaminationResponse> getExaminationsByDentistId(Long dentistId);

    /**
     * Updates clinical observations, complaint, or draft details while the examination is in DRAFT status.
     */
    ClinicalExaminationResponse updateDraftExamination(Long id, UpdateClinicalExaminationRequest request);

    /**
     * Updates clinical observations, complaint, or draft details with patient ownership verification.
     */
    ClinicalExaminationResponse updateDraftExamination(Long id, Long patientId, UpdateClinicalExaminationRequest request);

    /**
     * Finalizes and completes a draft clinical examination by an authorized dentist.
     */
    ClinicalExaminationResponse completeExamination(Long id, Long dentistId);

    /**
     * Overload for completing an examination.
     */
    ClinicalExaminationResponse completeExamination(Long id);

    /**
     * Cancels an examination by an authorized dentist while preserving its clinical audit trail.
     * Completed or already cancelled examinations cannot be cancelled.
     */
    ClinicalExaminationResponse cancelExamination(Long id, Long dentistId);

    /**
     * Overload for cancelling an examination.
     */
    ClinicalExaminationResponse cancelExamination(Long id);

    /**
     * Authoritatively confirms a diagnosis by a verified dentist.
     * Diagnosis confirmation is dentist-only and locks the confirmed diagnosis against silent overwriting.
     */
    ClinicalExaminationResponse confirmDiagnosis(Long id, ConfirmDiagnosisRequest request);
}
