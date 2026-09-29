package com.dentcare.billing.exception;

/**
 * Exception thrown when a monetary amount, quantity, or discount value is negative or invalid.
 */
public class InvalidBillingAmountException extends BillingValidationException {

    public InvalidBillingAmountException(String message) {
        super(message);
    }
}
