package com.dentcare.prescription.state;

import com.dentcare.prescription.entity.PrescriptionStatus;

public final class PrescriptionStateFactory {

    private PrescriptionStateFactory() {
        // Prevent creating objects of this utility class.
    }

    public static PrescriptionState from(PrescriptionStatus status) {

        if (status == null) {
            throw new IllegalArgumentException("Prescription status cannot be null.");
        }

        switch (status) {
            case DRAFT:
                return new DraftPrescriptionState();

            case FINALIZED:
                return new FinalizedPrescriptionState();

            case CANCELLED:
                return new CancelledPrescriptionState();

            default:
                throw new IllegalArgumentException(
                        "Unsupported prescription status: " + status
                );
        }
    }
}