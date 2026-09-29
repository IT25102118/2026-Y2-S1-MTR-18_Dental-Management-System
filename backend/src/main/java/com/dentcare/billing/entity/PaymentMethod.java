package com.dentcare.billing.entity;

/**
 * Authoritative payment methods accepted at the clinic for DentCare (MF-05).
 * Strictly limited to the four canonical clinic payment methods.
 */
public enum PaymentMethod {
    CASH,
    CARD,
    BANK_TRANSFER,
    OTHER
}
