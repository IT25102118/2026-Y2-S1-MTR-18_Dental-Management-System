package com.dentcare.billing.exception;

/**
 * Base domain exception for billing calculation and validation failures in DentCare (MF-05).
 */
public class BillingValidationException extends RuntimeException {

    public BillingValidationException(String message) {
        super(message);
    }

    public BillingValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
