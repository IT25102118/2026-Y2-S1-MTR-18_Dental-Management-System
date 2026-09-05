package com.dentcare.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for reversing a historical stock movement.
 */
public class ReverseStockMovementRequest {

    @NotBlank(message = "Reversal reason is required")
    @Size(max = 255, message = "Reason must not exceed 255 characters")
    private String reason;

    @NotNull(message = "Responsible user ID is required")
    private Long responsibleUserId;

    public ReverseStockMovementRequest() {
    }

    public ReverseStockMovementRequest(String reason, Long responsibleUserId) {
        this.reason = reason;
        this.responsibleUserId = responsibleUserId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getResponsibleUserId() {
        return responsibleUserId;
    }

    public void setResponsibleUserId(Long responsibleUserId) {
        this.responsibleUserId = responsibleUserId;
    }
}
