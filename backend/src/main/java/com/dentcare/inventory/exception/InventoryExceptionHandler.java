package com.dentcare.inventory.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller advice strictly scoped to the inventory module.
 * Maps domain exceptions to standard HTTP error responses.
 */
@RestControllerAdvice(basePackages = "com.dentcare.inventory")
public class InventoryExceptionHandler {

    @ExceptionHandler(InventoryItemNotFoundException.class)
    public ResponseEntity<InventoryErrorResponse> handleItemNotFound(InventoryItemNotFoundException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DuplicateItemCodeException.class)
    public ResponseEntity<InventoryErrorResponse> handleDuplicateItemCode(DuplicateItemCodeException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<InventoryErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Validation failed",
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<InventoryErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<InventoryErrorResponse> handleInsufficientStock(InsufficientStockException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InactiveInventoryItemException.class)
    public ResponseEntity<InventoryErrorResponse> handleInactiveItem(InactiveInventoryItemException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidMovementException.class)
    public ResponseEntity<InventoryErrorResponse> handleInvalidMovement(InvalidMovementException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<InventoryErrorResponse> handleIllegalState(IllegalStateException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(StockMovementNotFoundException.class)
    public ResponseEntity<InventoryErrorResponse> handleStockMovementNotFound(StockMovementNotFoundException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DuplicateReversalException.class)
    public ResponseEntity<InventoryErrorResponse> handleDuplicateReversal(DuplicateReversalException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InventoryBatchNotFoundException.class)
    public ResponseEntity<InventoryErrorResponse> handleBatchNotFound(InventoryBatchNotFoundException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<InventoryErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String message = "Database constraint violation";
        String detailed = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        if (detailed != null) {
            String lower = detailed.toLowerCase();
            if (lower.contains("item_code") || lower.contains("duplicate") || lower.contains("unique")) {
                message = "An inventory item with this code already exists";
            }
        }
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                message
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<InventoryErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String name = ex.getName();
        String value = ex.getValue() != null ? ex.getValue().toString() : "null";
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Invalid parameter value '" + value + "' for '" + name + "'"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<InventoryErrorResponse> handleMalformedJson(HttpMessageNotReadableException ex) {
        InventoryErrorResponse response = InventoryErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Malformed or unreadable JSON request body"
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}


