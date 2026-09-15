package com.dentcare.patient.service;

import com.dentcare.patient.dto.CreatePatientRequest;
import com.dentcare.patient.dto.PatientResponse;
import com.dentcare.patient.dto.PatientSummaryResponse;
import com.dentcare.patient.dto.UpdatePatientRequest;
import com.dentcare.patient.dto.UpdatePatientStatusRequest;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.exception.DuplicatePatientCodeException;
import com.dentcare.patient.exception.PatientNotFoundException;
import com.dentcare.patient.repository.PatientRepository;
import com.dentcare.patient.repository.PatientSpecifications;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional(readOnly = true)
public class PatientServiceImpl implements PatientService {
    private final PatientRepository patientRepository;
    private final Validator validator;

    public PatientServiceImpl(PatientRepository patientRepository, Validator validator) {
        this.patientRepository = patientRepository;
        this.validator = validator;
    }

    @Override
    @Transactional
    public PatientResponse createPatient(CreatePatientRequest request) {
        validate(request);
        String code = request.getPatientCode().trim();
        if (patientRepository.existsByPatientCode(code)) {
            throw new DuplicatePatientCodeException(code);
        }
        Patient patient = new Patient(code, request.getFirstName(), request.getLastName(),
                request.getDateOfBirth(), request.getGender(), request.getPhone());
        patient.setEmail(request.getEmail());
        patient.setAddressLine1(request.getAddressLine1());
        patient.setAddressLine2(request.getAddressLine2());
        patient.setCity(request.getCity());
        patient.setEmergencyContactName(request.getEmergencyContactName());
        patient.setEmergencyContactPhone(request.getEmergencyContactPhone());
        patient.setEmergencyContactRelationship(request.getEmergencyContactRelationship());
        patient.setAllergies(request.getAllergies());
        patient.setMedicalConditions(request.getMedicalConditions());
        patient.setCurrentMedications(request.getCurrentMedications());
        patient.setDentalHistory(request.getDentalHistory());
        patient.setNotes(request.getNotes());
        return saveResponse(patient);
    }

    @Override
    public PatientResponse getPatientById(Long id) {
        return PatientResponse.fromEntity(findPatient(id));
    }

    @Override
    @Transactional
    public PatientResponse updatePatient(Long id, UpdatePatientRequest request) {
        validate(request);
        Patient patient = findPatient(id);
        // Explicit allowlist: never copy code, userId, lifecycle state, version or audit timestamps.
        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());
        patient.setEmail(request.getEmail());
        patient.setPhone(request.getPhone());
        patient.setAddressLine1(request.getAddressLine1());
        patient.setAddressLine2(request.getAddressLine2());
        patient.setCity(request.getCity());
        patient.setEmergencyContactName(request.getEmergencyContactName());
        patient.setEmergencyContactPhone(request.getEmergencyContactPhone());
        patient.setEmergencyContactRelationship(request.getEmergencyContactRelationship());
        patient.setAllergies(request.getAllergies());
        patient.setMedicalConditions(request.getMedicalConditions());
        patient.setCurrentMedications(request.getCurrentMedications());
        patient.setDentalHistory(request.getDentalHistory());
        patient.setNotes(request.getNotes());
        return saveResponse(patient);
    }

    @Override
    @Transactional
    public PatientResponse updatePatientStatus(Long id, UpdatePatientStatusRequest request) {
        validate(request);
        Patient patient = findPatient(id);
        if (patient.isActive() == request.getActive()) {
            return PatientResponse.fromEntity(patient);
        }
        patient.setActive(request.getActive());
        if (!request.getActive()) {
            patient.setDeactivationReason(request.getDeactivationReason());
            patient.setDeactivatedAt(LocalDateTime.now());
        }
        // Keep profile/history and the last deactivation metadata on reactivation.
        return saveResponse(patient);
    }

    @Override
    public Page<PatientSummaryResponse> searchPatients(String search, Boolean active, Gender gender, Pageable pageable) {
        if (pageable == null) {
            throw new IllegalArgumentException("Pageable is required");
        }
        return patientRepository.findAll(PatientSpecifications.buildSpecification(search, active, gender), pageable)
                .map(PatientSummaryResponse::fromEntity);
    }

    private Patient findPatient(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Patient ID is required");
        }
        return patientRepository.findById(id).orElseThrow(() -> new PatientNotFoundException(id));
    }

    private <T> void validate(T request) {
        if (request == null) {
            throw new IllegalArgumentException("Patient request is required");
        }
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
    }

    private PatientResponse saveResponse(Patient patient) {
        // Flush so entity normalization, optimistic locking and updatedAt run before response mapping.
        return PatientResponse.fromEntity(patientRepository.saveAndFlush(patient));
    }
}
