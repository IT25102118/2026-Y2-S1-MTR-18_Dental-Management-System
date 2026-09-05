package com.dentcare.security.controller;

import com.dentcare.security.dto.PatientRegistrationRequest;
import com.dentcare.security.dto.PatientRegistrationResponse;
import com.dentcare.security.service.PatientRegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public REST controller for patient self-registration.
 */
@RestController
@RequestMapping("/api/auth")
public class PatientRegistrationController {

    private final PatientRegistrationService patientRegistrationService;

    public PatientRegistrationController(PatientRegistrationService patientRegistrationService) {
        this.patientRegistrationService = patientRegistrationService;
    }

    /**
     * Registers a new patient account with strictly enforced PATIENT role and BCrypt password hashing.
     *
     * @param request the incoming patient registration payload
     * @return 201 Created with public patient account information
     */
    @PostMapping("/register/patient")
    public ResponseEntity<PatientRegistrationResponse> registerPatient(
            @Valid @RequestBody PatientRegistrationRequest request) {
        PatientRegistrationResponse response = patientRegistrationService.registerPatient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
