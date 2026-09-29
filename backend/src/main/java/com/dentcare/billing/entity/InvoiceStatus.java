package com.dentcare.billing.entity;

/**
 * Authoritative lifecycle status for invoices in DentCare (MF-05).
 * Follows the canonical status progression:
 * DRAFT -> UNPAID -> PARTIALLY_PAID -> PAID, with CANCELLED for voided invoices.
 */
public enum InvoiceStatus {
    DRAFT,
    UNPAID,
    PARTIALLY_PAID,
    PAID,
    CANCELLED
}
