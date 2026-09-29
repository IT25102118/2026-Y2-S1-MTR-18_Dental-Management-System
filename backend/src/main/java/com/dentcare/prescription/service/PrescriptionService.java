package com.dentcare.prescription.service;

import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.PrescriptionResponse;
import com.dentcare.prescription.dto.PrescriptionSummaryResponse;
import com.dentcare.prescription.dto.UpdatePrescriptionRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for prescription lifecycle and CRUD operations.
 */
public interface PrescriptionService {

    /**
     * Creates a new DRAFT prescription for a valid PATIENT user, authored by a valid DENTIST user.
     */
    PrescriptionResponse createPrescription(CreatePrescriptionRequest request);

    /**
     * Retrieves a prescription by its primary key, including all medicine items.
     */
    PrescriptionResponse getPrescriptionById(Long id);

    /**
     * Lists prescriptions for a given patient, paginated.
     */
    Page<PrescriptionSummaryResponse> getPrescriptionsByPatient(Long patientId, Pageable pageable);

    /**
     * Lists all prescriptions, paginated.
     */
    Page<PrescriptionSummaryResponse> getAllPrescriptions(Pageable pageable);

    /**
     * Updates the notes and/or items of a DRAFT prescription.
     * Throws PrescriptionStateException if the prescription is not in DRAFT status.
     */
    PrescriptionResponse updatePrescription(Long id, UpdatePrescriptionRequest request);

    /**
     * Finalizes a DRAFT prescription.
     * Requires at least one medicine item.
     * Requires the caller to be a DENTIST (validated via finalizingDentistId).
     * Changes status from DRAFT to FINALIZED.
     */
    PrescriptionResponse finalizePrescription(Long id, Long finalizingDentistId);

    /**
     * Cancels a prescription (DRAFT or FINALIZED) by setting its status to CANCELLED.
     * Records are preserved; no physical deletion occurs.
     */
    PrescriptionResponse cancelPrescription(Long id);
}
