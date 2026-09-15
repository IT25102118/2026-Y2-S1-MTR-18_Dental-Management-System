package com.dentcare.patient.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Map;

/** Uses the same error fields as the existing DentCare module error responses. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PatientErrorResponse(int status, String error, String message,
                                   LocalDateTime timestamp, Map<String, String> fieldErrors) {
    public static PatientErrorResponse of(HttpStatus status, String message, Map<String, String> fieldErrors) {
        return new PatientErrorResponse(status.value(), status.getReasonPhrase(), message, LocalDateTime.now(), fieldErrors);
    }
}
