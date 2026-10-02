package com.dentcare.patient.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for toggling or updating the active status of a patient record.
 */
public class UpdatePatientStatusRequest {

    @NotNull(message = "Active status is required")
    private Boolean active;

    @Size(max = 255, message = "Deactivation reason cannot exceed 255 characters")
    private String deactivationReason;

    public UpdatePatientStatusRequest() {
    }

    public UpdatePatientStatusRequest(Boolean active) {
        this(active, null);
    }

    public UpdatePatientStatusRequest(Boolean active, String deactivationReason) {
        this.active = active;
        this.deactivationReason = deactivationReason;
    }

    public Boolean getActive() {
        return active;
    }

    public Boolean isActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getDeactivationReason() {
        return deactivationReason;
    }

    public void setDeactivationReason(String deactivationReason) {
        this.deactivationReason = deactivationReason;
    }
}
