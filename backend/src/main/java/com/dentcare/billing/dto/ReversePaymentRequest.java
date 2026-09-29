package com.dentcare.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for reversing an existing recorded payment.
 * Requires an explicit audit reason explaining the financial correction.
 */
public class ReversePaymentRequest {

    @NotBlank(message = "Reversal reason is required")
    @Size(max = 255, message = "Reversal reason must not exceed 255 characters")
    private String reason;

    public ReversePaymentRequest() {
    }

    public ReversePaymentRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
