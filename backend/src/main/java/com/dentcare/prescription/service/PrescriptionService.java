package com.dentcare.prescription.service;

import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.ExaminationPrescriptionContextResponse;
import com.dentcare.prescription.dto.PatientSafetyResponse;
import com.dentcare.prescription.dto.PrescriptionResponse;
import com.dentcare.prescription.dto.PrescriptionSummaryResponse;
import com.dentcare.prescription.dto.UpdatePrescriptionRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for prescription lifecycle,
 * patient safety, and Clinical Examination integration.
 */
public interface PrescriptionService {

    PrescriptionResponse createPrescription(
            CreatePrescriptionRequest request
    );

    PrescriptionResponse getPrescriptionById(Long id);

    Page<PrescriptionSummaryResponse> getPrescriptionsByPatient(
            Long patientId,
            Pageable pageable
    );

    Page<PrescriptionSummaryResponse> getAllPrescriptions(
            Pageable pageable
    );

    PrescriptionResponse updatePrescription(
            Long id,
            UpdatePrescriptionRequest request
    );

    PrescriptionResponse finalizePrescription(
            Long id,
            Long finalizingDentistId
    );

    PrescriptionResponse cancelPrescription(Long id);

    /**
     * Returns the patient's recorded allergy information.
     */
    PatientSafetyResponse getPatientSafety(
            Long patientUserId
    );

    /**
     * Reads Clinical Examination information and converts
     * the Clinical patient-record ID to the PATIENT user ID
     * required by Prescription Management.
     */
    ExaminationPrescriptionContextResponse
    getExaminationPrescriptionContext(
            Long examinationId
    );
}