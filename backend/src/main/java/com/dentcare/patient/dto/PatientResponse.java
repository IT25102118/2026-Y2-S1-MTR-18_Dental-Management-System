package com.dentcare.patient.dto;

import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Authoritative response DTO exposing full patient record details.
 * Excludes internal optimistic locking version, account linkage and authentication credentials.
 */
public record PatientResponse(
        Long id,
        String patientCode,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        Gender gender,
        String email,
        String phone,
        String addressLine1,
        String addressLine2,
        String city,
        String emergencyContactName,
        String emergencyContactPhone,
        String emergencyContactRelationship,
        String allergies,
        String medicalConditions,
        String currentMedications,
        String dentalHistory,
        String notes,
        boolean active,
        String deactivationReason,
        LocalDateTime deactivatedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static PatientResponse fromEntity(Patient patient) {
        if (patient == null) {
            return null;
        }
        return new PatientResponse(
                patient.getId(),
                patient.getPatientCode(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getEmail(),
                patient.getPhone(),
                patient.getAddressLine1(),
                patient.getAddressLine2(),
                patient.getCity(),
                patient.getEmergencyContactName(),
                patient.getEmergencyContactPhone(),
                patient.getEmergencyContactRelationship(),
                patient.getAllergies(),
                patient.getMedicalConditions(),
                patient.getCurrentMedications(),
                patient.getDentalHistory(),
                patient.getNotes(),
                patient.isActive(),
                patient.getDeactivationReason(),
                patient.getDeactivatedAt(),
                patient.getCreatedAt(),
                patient.getUpdatedAt()
        );
    }
}
