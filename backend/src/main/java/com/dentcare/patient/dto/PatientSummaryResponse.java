package com.dentcare.patient.dto;

import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Summary response DTO exposing concise patient demographic and identification details
 * for tabular lists, searches, and selection dropdowns.
 */
public record PatientSummaryResponse(
        Long id,
        String patientCode,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        Gender gender,
        String email,
        String phone,
        String city,
        boolean active,
        LocalDateTime createdAt
) {
    public static PatientSummaryResponse fromEntity(Patient patient) {
        if (patient == null) {
            return null;
        }
        return new PatientSummaryResponse(
                patient.getId(),
                patient.getPatientCode(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getEmail(),
                patient.getPhone(),
                patient.getCity(),
                patient.isActive(),
                patient.getCreatedAt()
        );
    }
}
