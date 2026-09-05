package com.dentcare.security.service;

import com.dentcare.security.dto.PatientRegistrationRequest;
import com.dentcare.security.dto.PatientRegistrationResponse;

/**
 * Service interface defining business logic for patient self-registration.
 */
public interface PatientRegistrationService {

    /**
     * Registers a new patient account with normalized email, securely hashed password,
     * and strictly assigned PATIENT role.
     *
     * @param request the validated registration request
     * @return the public registration response DTO
     */
    PatientRegistrationResponse registerPatient(PatientRegistrationRequest request);
}
