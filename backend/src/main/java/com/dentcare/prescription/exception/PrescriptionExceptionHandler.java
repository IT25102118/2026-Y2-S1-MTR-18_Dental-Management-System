package com.dentcare.prescription.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller advice strictly scoped to the prescription module.
 * Maps domain exceptions to standard HTTP error responses.
 */
@RestControllerAdvice(basePackages = "com.dentcare.prescription")
public class PrescriptionExceptionHandler {

    @ExceptionHandler(PrescriptionNotFoundException.class)
    public ResponseEntity<PrescriptionErrorResponse> handleNotFound(PrescriptionNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                PrescriptionErrorResponse.of(HttpStatus.NOT_FOUND.value(), "Not Found", ex.getMessage())
        );
    }

    @ExceptionHandler(PrescriptionStateException.class)
    public ResponseEntity<PrescriptionErrorResponse> handleStateViolation(PrescriptionStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                PrescriptionErrorResponse.of(HttpStatus.CONFLICT.value(), "Conflict", ex.getMessage())
        );
    }

    @ExceptionHandler(InvalidPrescriptionUserRoleException.class)
    public ResponseEntity<PrescriptionErrorResponse> handleInvalidRole(InvalidPrescriptionUserRoleException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                PrescriptionErrorResponse.of(HttpStatus.BAD_REQUEST.value(), "Bad Request", ex.getMessage())
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<PrescriptionErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                PrescriptionErrorResponse.of(HttpStatus.BAD_REQUEST.value(), "Bad Request", "Validation failed", fieldErrors)
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<PrescriptionErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                PrescriptionErrorResponse.of(HttpStatus.BAD_REQUEST.value(), "Bad Request", ex.getMessage())
        );
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<PrescriptionErrorResponse> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                PrescriptionErrorResponse.of(HttpStatus.CONFLICT.value(), "Conflict", ex.getMessage())
        );
    }
}
