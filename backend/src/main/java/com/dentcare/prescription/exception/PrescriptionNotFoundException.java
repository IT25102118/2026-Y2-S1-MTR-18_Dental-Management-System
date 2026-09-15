package com.dentcare.prescription.exception;

/**
 * Exception thrown when a prescription cannot be found by its identifier.
 */
public class PrescriptionNotFoundException extends RuntimeException {

    private final Long prescriptionId;

    public PrescriptionNotFoundException(Long prescriptionId) {
        super("Prescription not found with id: " + prescriptionId);
        this.prescriptionId = prescriptionId;
    }

    public Long getPrescriptionId() {
        return prescriptionId;
    }
}
