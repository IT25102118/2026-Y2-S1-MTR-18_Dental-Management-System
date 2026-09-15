package com.dentcare.clinical.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller advice strictly scoped to the clinical module.
 * Maps clinical domain exceptions to standard HTTP error responses.
 */
@RestControllerAdvice(basePackages = "com.dentcare.clinical")
public class ClinicalExceptionHandler {

    @ExceptionHandler(ClinicalExaminationNotFoundException.class)
    public ResponseEntity<ClinicalErrorResponse> handleClinicalExaminationNotFound(ClinicalExaminationNotFoundException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(ToothFindingNotFoundException.class)
    public ResponseEntity<ClinicalErrorResponse> handleToothFindingNotFound(ToothFindingNotFoundException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(TreatmentPlanNotFoundException.class)
    public ResponseEntity<ClinicalErrorResponse> handleTreatmentPlanNotFound(TreatmentPlanNotFoundException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(TreatmentProcedureNotFoundException.class)
    public ResponseEntity<ClinicalErrorResponse> handleTreatmentProcedureNotFound(TreatmentProcedureNotFoundException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(PatientNotFoundException.class)
    public ResponseEntity<ClinicalErrorResponse> handlePatientNotFound(PatientNotFoundException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DentistNotFoundException.class)
    public ResponseEntity<ClinicalErrorResponse> handleDentistNotFound(DentistNotFoundException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(InvalidClinicalExaminationStateException.class)
    public ResponseEntity<ClinicalErrorResponse> handleInvalidExaminationState(InvalidClinicalExaminationStateException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidTreatmentPlanStateException.class)
    public ResponseEntity<ClinicalErrorResponse> handleInvalidPlanState(InvalidTreatmentPlanStateException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidTreatmentProcedureStateException.class)
    public ResponseEntity<ClinicalErrorResponse> handleInvalidProcedureState(InvalidTreatmentProcedureStateException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidDiagnosisConfirmationException.class)
    public ResponseEntity<ClinicalErrorResponse> handleInvalidDiagnosisConfirmation(InvalidDiagnosisConfirmationException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "Conflict",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidToothNumberException.class)
    public ResponseEntity<ClinicalErrorResponse> handleInvalidToothNumber(InvalidToothNumberException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(UnauthorizedClinicalOperationException.class)
    public ResponseEntity<ClinicalErrorResponse> handleUnauthorizedClinicalOperation(UnauthorizedClinicalOperationException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(PatientMismatchException.class)
    public ResponseEntity<ClinicalErrorResponse> handlePatientMismatch(PatientMismatchException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ClinicalErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Validation failed",
                fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ClinicalErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        ClinicalErrorResponse response = ClinicalErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Standard error response model for clinical module API endpoints.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ClinicalErrorResponse {

        private int status;
        private String error;
        private String message;
        private LocalDateTime timestamp;
        private Map<String, String> fieldErrors;

        public ClinicalErrorResponse() {
        }

        public ClinicalErrorResponse(int status, String error, String message, LocalDateTime timestamp) {
            this.status = status;
            this.error = error;
            this.message = message;
            this.timestamp = timestamp;
        }

        public ClinicalErrorResponse(int status, String error, String message, LocalDateTime timestamp, Map<String, String> fieldErrors) {
            this.status = status;
            this.error = error;
            this.message = message;
            this.timestamp = timestamp;
            this.fieldErrors = fieldErrors;
        }

        public static ClinicalErrorResponse of(int status, String error, String message) {
            return new ClinicalErrorResponse(status, error, message, LocalDateTime.now());
        }

        public static ClinicalErrorResponse of(int status, String error, String message, Map<String, String> fieldErrors) {
            return new ClinicalErrorResponse(status, error, message, LocalDateTime.now(), fieldErrors);
        }

        public int getStatus() {
            return status;
        }

        public void setStatus(int status) {
            this.status = status;
        }

        public String getError() {
            return error;
        }

        public void setError(String error) {
            this.error = error;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public LocalDateTime getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }

        public void setFieldErrors(Map<String, String> fieldErrors) {
            this.fieldErrors = fieldErrors;
        }
    }
}
