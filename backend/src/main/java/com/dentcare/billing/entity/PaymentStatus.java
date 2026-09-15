package com.dentcare.billing.entity;

/**
 * Operational status for recorded payments in DentCare (MF-05).
 * Supports controlled correction and reversal without silent deletion:
 * - RECORDED: Active payment transaction contributing to paidAmount and reducing balance.
 * - REVERSED: Corrected/compensated transaction excluded from paidAmount.
 */
public enum PaymentStatus {
    RECORDED,
    REVERSED
}
