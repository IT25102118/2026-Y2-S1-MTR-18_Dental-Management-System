package com.dentcare.patient.dto;

import jakarta.validation.constraints.Size;

/**
 * Data transfer object for patient profile self-service updates.
 * Strictly limited to self-editable fields (currently phone only).
 * Prohibits modification of identity, email, role, or clinical data.
 */
public record UpdatePatientProfileRequest(
        @Size(max = 25, message = "Phone number cannot exceed 25 characters")
        String phone
) {
}
