package com.dentcare.prescription.state;

import com.dentcare.prescription.exception.PrescriptionStateException;

public class CancelledPrescriptionState implements PrescriptionState {

    @Override
    public void validateCanEdit(Long prescriptionId) {
        throw new PrescriptionStateException(
                "Prescription " + prescriptionId
                        + " cannot be edited because its status is CANCELLED. "
                        + "Only DRAFT prescriptions may be updated."
        );
    }

    @Override
    public void validateCanFinalize(Long prescriptionId) {
        throw new PrescriptionStateException(
                "Prescription " + prescriptionId
                        + " cannot be finalized because its status is CANCELLED. "
                        + "Only DRAFT prescriptions may be finalized."
        );
    }

    @Override
    public void validateCanCancel(Long prescriptionId) {
        throw new PrescriptionStateException(
                "Prescription " + prescriptionId + " is already cancelled."
        );
    }
}