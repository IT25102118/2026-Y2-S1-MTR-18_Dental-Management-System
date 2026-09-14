package com.dentcare.billing.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller advice strictly scoped to the billing module (MF-05).
 * Maps domain exceptions, lifecycle violations, and validation failures to standard HTTP error responses.
 */
@RestControllerAdvice(basePackages = "com.dentcare.billing")
public class BillingExceptionHandler {

    @ExceptionHandler(InvoiceNotFoundException.class)
    public ResponseEntity<BillingErrorResponse> handleInvoiceNotFound(InvoiceNotFoundException ex) {
        BillingErrorResponse response = BillingErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(InvalidInvoiceStatusException.class)
    public ResponseEntity<BillingErrorResponse> handleInvalidInvoiceStatus(InvalidInvoiceStatusException ex) {
        BillingErrorResponse response = BillingErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(BillingValidationException.class)
    public ResponseEntity<BillingErrorResponse> handleBillingValidation(BillingValidationException ex) {
        BillingErrorResponse response = BillingErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BillingErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        BillingErrorResponse response = BillingErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Validation failed",
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<BillingErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        BillingErrorResponse response = BillingErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Malformed request body or invalid field value"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}