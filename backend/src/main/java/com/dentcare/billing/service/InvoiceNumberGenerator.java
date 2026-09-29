package com.dentcare.billing.service;

/**
 * Strategy interface for generating unique business invoice identifiers.
 * Isolates identifier formatting so presentation rules can be configured independently
 * without altering core workflow services.
 */
public interface InvoiceNumberGenerator {

    /**
     * Generates a unique business invoice reference fitting the database schema limit.
     *
     * @return non-null, non-blank unique invoice number string
     */
    String generate();
}
