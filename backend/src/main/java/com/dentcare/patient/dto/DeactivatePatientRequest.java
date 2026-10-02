package com.dentcare.patient.dto;

import jakarta.validation.constraints.Size;

/** HTTP payload for deactivation; the endpoint determines the target active status. */
public class DeactivatePatientRequest {

    @Size(max = 255, message = "Deactivation reason cannot exceed 255 characters")
    private String deactivationReason;

    public DeactivatePatientRequest() {
    }

    public String getDeactivationReason() {
        return deactivationReason;
    }

    public void setDeactivationReason(String deactivationReason) {
        this.deactivationReason = deactivationReason;
    }
}
