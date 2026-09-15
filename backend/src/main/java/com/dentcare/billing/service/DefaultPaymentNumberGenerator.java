package com.dentcare.billing.service;

import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Default implementation of {@link PaymentNumberGenerator}.
 * Produces an opaque, collision-resistant identifier (e.g. "REC-...") within the 50-character schema limit,
 * avoiding arbitrary assumptions about clinic sequence or receipt counter policies.
 */
@Component
public class DefaultPaymentNumberGenerator implements PaymentNumberGenerator {

    private static final String PREFIX = "REC-";

    @Override
    public String generate() {
        return PREFIX + UUID.randomUUID().toString().toUpperCase();
    }
}
