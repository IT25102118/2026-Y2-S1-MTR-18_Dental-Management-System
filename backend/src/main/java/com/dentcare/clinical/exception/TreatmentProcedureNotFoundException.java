package com.dentcare.clinical.exception;

/**
 * Exception thrown when a treatment procedure cannot be located by its identifier.
 */
public class TreatmentProcedureNotFoundException extends RuntimeException {

    public TreatmentProcedureNotFoundException(Long id) {
        super("Treatment procedure not found with id: " + id);
    }

    public TreatmentProcedureNotFoundException(String message) {
        super(message);
    }
}
