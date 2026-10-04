package com.dentcare.clinical.integration;

import com.dentcare.clinical.dto.PatientMedicalSummaryDto;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Adapter implementing {@link PatientLookupPort} by delegating to MF-01's
 * authoritative {@link PatientRepository} using {@link Patient#getId()}.
 */
@Component
@Primary
public class PatientRecordLookupAdapter implements PatientLookupPort {

    private final PatientRepository patientRepository;

    public PatientRecordLookupAdapter(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Override
    public boolean existsActivePatient(Long patientId) {
        if (patientId == null) {
            return false;
        }
        return patientRepository.findById(patientId)
                .filter(Patient::isActive)
                .isPresent();
    }

    @Override
    public Optional<PatientMedicalSummaryDto> getPatientMedicalSummary(Long patientId) {
        if (patientId == null) {
            return Optional.empty();
        }
        return patientRepository.findById(patientId)
                .map(patient -> new PatientMedicalSummaryDto(
                        patient.getId(),
                        patient.getAllergies(),
                        patient.getMedicalConditions(),
                        patient.getCurrentMedications(),
                        patient.getDentalHistory(),
                        patient.getNotes()
                ));
    }
}
