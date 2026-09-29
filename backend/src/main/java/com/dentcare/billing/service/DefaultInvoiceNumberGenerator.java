package com.dentcare.billing.service;

import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Default implementation of {@link InvoiceNumberGenerator}.
 * Produces an opaque, collision-resistant identifier (e.g. "INV-...") within the 50-character schema limit,
 * avoiding arbitrary assumptions about clinic sequence or annual numbering schemes.
 */
@Component
public class DefaultInvoiceNumberGenerator implements InvoiceNumberGenerator {

    private static final String PREFIX = "INV-";

    @Override
    public String generate() {
        return PREFIX + UUID.randomUUID().toString().toUpperCase();
    }
}
