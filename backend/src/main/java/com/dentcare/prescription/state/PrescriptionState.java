package com.dentcare.prescription.state;

public interface PrescriptionState {

    void validateCanEdit(Long prescriptionId);

    void validateCanFinalize(Long prescriptionId);

    void validateCanCancel(Long prescriptionId);
}