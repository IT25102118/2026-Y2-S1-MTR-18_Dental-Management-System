package com.dentcare.patient.service;

import com.dentcare.patient.dto.CreatePatientRequest;
import com.dentcare.patient.dto.PatientResponse;
import com.dentcare.patient.dto.PatientSummaryResponse;
import com.dentcare.patient.dto.UpdatePatientRequest;
import com.dentcare.patient.dto.UpdatePatientStatusRequest;
import com.dentcare.patient.entity.Gender;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Patient profile and lifecycle operations. No permanent deletion or account linking. */
public interface PatientService {

    /** Creates a record using the explicit code required by the committed DTO; does not generate codes. */
    PatientResponse createPatient(CreatePatientRequest request);

    /** Retrieves active or inactive patient details. */
    PatientResponse getPatientById(Long id);

    /** Replaces only profile fields allowed by the DTO, including clearing optional fields with null. */
    PatientResponse updatePatient(Long id, UpdatePatientRequest request);

    /**
     * Deactivates/reactivates without deletion. Repeating the current status is a no-op.
     * Reactivation retains the last deactivation reason/time; these are not a lifecycle event log.
     */
    PatientResponse updatePatientStatus(Long id, UpdatePatientStatusRequest request);

    Page<PatientSummaryResponse> searchPatients(String search, Boolean active, Gender gender, Pageable pageable);
}
