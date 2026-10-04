package com.dentcare.patient.dto;

/**
 * Safe public representation of a successful password change operation.
 * Strictly omits credentials, tokens, or security hashes.
 */
public record PasswordChangeResponse(String message) {
    public static PasswordChangeResponse success() {
        return new PasswordChangeResponse("Password changed successfully.");
    }
}
