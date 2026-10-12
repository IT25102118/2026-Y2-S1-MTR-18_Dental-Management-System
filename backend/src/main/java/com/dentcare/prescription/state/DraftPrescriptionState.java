package com.dentcare.prescription.state;

public class DraftPrescriptionState implements PrescriptionState {

    @Override
    public void validateCanEdit(Long prescriptionId) {
        // DRAFT prescriptions can be edited.
    }

    @Override
    public void validateCanFinalize(Long prescriptionId) {
        // DRAFT prescriptions can be finalized.
    }

    @Override
    public void validateCanCancel(Long prescriptionId) {
        // DRAFT prescriptions can be cancelled.
    }
}