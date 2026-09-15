package com.dentcare.prescription.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Standard error response model for prescription module API endpoints.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PrescriptionErrorResponse {

    private int status;
    private String error;
    private String message;
    private LocalDateTime timestamp;
    private Map<String, String> fieldErrors;

    public PrescriptionErrorResponse() {
    }

    public PrescriptionErrorResponse(int status, String error, String message, LocalDateTime timestamp) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.timestamp = timestamp;
    }

    public PrescriptionErrorResponse(int status, String error, String message, LocalDateTime timestamp, Map<String, String> fieldErrors) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.timestamp = timestamp;
        this.fieldErrors = fieldErrors;
    }

    public static PrescriptionErrorResponse of(int status, String error, String message) {
        return new PrescriptionErrorResponse(status, error, message, LocalDateTime.now());
    }

    public static PrescriptionErrorResponse of(int status, String error, String message, Map<String, String> fieldErrors) {
        return new PrescriptionErrorResponse(status, error, message, LocalDateTime.now(), fieldErrors);
    }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Map<String, String> getFieldErrors() { return fieldErrors; }
    public void setFieldErrors(Map<String, String> fieldErrors) { this.fieldErrors = fieldErrors; }
}
