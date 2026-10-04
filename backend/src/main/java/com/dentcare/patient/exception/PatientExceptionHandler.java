package com.dentcare.patient.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/** HTTP mappings are restricted to MF-01; shared and other module handlers are unchanged. */
@RestControllerAdvice(basePackages = "com.dentcare.patient")
public class PatientExceptionHandler {

    @ExceptionHandler(PatientNotFoundException.class)
    public ResponseEntity<PatientErrorResponse> handleNotFound(PatientNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(DuplicatePatientCodeException.class)
    public ResponseEntity<PatientErrorResponse> handleDuplicateCode(DuplicatePatientCodeException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<PatientErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(field -> fields.put(field.getField(), field.getDefaultMessage()));
        return ResponseEntity.badRequest().body(PatientErrorResponse.of(HttpStatus.BAD_REQUEST, "Validation failed", fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<PatientErrorResponse> handleServiceValidation(ConstraintViolationException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation -> fields.put(violation.getPropertyPath().toString(), violation.getMessage()));
        return ResponseEntity.badRequest().body(PatientErrorResponse.of(HttpStatus.BAD_REQUEST, "Validation failed", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<PatientErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return error(HttpStatus.BAD_REQUEST, "Request body is missing or contains invalid JSON or field values");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<PatientErrorResponse> handleInvalidParameter(MethodArgumentTypeMismatchException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid value for parameter: " + ex.getName());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<PatientErrorResponse> handleInvalidArgument(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<PatientErrorResponse> handleInvalidState(IllegalStateException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<PatientErrorResponse> handleConcurrentUpdate(OptimisticLockingFailureException ex) {
        return error(HttpStatus.CONFLICT, "Patient record changed concurrently; reload it before retrying");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<PatientErrorResponse> handleConstraintConflict(DataIntegrityViolationException ex) {
        // Also covers concurrent inserts that race the service's unique-code precheck; never return SQL details.
        return error(HttpStatus.CONFLICT, "Patient record conflicts with existing data");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<PatientErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return error(status, ex.getReason());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<PatientErrorResponse> handleUnexpected(Exception ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to process the patient record request");
    }

    private ResponseEntity<PatientErrorResponse> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(PatientErrorResponse.of(status, message, null));
    }
}
