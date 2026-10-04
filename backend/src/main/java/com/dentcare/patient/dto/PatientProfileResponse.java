package com.dentcare.patient.dto;

import com.dentcare.security.entity.User;

/**
 * Safe public representation of a patient profile after self-service updates.
 * Strictly omits passwords, hashes, session identifiers, and sensitive internal fields.
 */
public record PatientProfileResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        String role
) {
    public static PatientProfileResponse fromUser(User user) {
        return new PatientProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole() != null ? user.getRole().name() : null
        );
    }
}
