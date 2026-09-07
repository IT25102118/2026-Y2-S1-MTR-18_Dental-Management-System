package com.dentcare.security.exception;

import com.dentcare.security.dto.AuthErrorResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller advice handling security and authentication module exceptions.
 * Explicitly scoped to com.dentcare.security to guarantee zero interference with
 * inventory or clinical exception handlers.
 */
@RestControllerAdvice(basePackages = "com.dentcare.security")
public class AuthExceptionHandler {

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<AuthErrorResponse> handleDuplicateEmailException(DuplicateEmailException ex) {
        AuthErrorResponse error = AuthErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AuthErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        AuthErrorResponse error = AuthErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Validation failed",
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<AuthErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        AuthErrorResponse error = AuthErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(InvalidStaffRoleException.class)
    public ResponseEntity<AuthErrorResponse> handleInvalidStaffRole(InvalidStaffRoleException ex) {
        AuthErrorResponse error = AuthErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<AuthErrorResponse> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        AuthErrorResponse error = AuthErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Malformed request body or invalid field value"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
}
