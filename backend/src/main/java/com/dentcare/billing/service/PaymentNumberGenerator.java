package com.dentcare.billing.service;

/**
 * Strategy interface for generating unique business receipt/payment numbers.
 * Isolates identifier formatting so presentation rules can be configured independently
 * without altering core payment recording workflow.
 */
public interface PaymentNumberGenerator {

    /**
     * Generates a unique business payment reference fitting the database schema limit.
     *
     * @return non-null, non-blank unique payment number string
     */
    String generate();
}
