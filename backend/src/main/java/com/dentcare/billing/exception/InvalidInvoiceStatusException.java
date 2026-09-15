package com.dentcare.billing.exception;

import com.dentcare.billing.entity.InvoiceStatus;

/**
 * Exception thrown when an attempted invoice operation is invalid for its current lifecycle status.
 */
public class InvalidInvoiceStatusException extends BillingValidationException {

    private final Long invoiceId;
    private final InvoiceStatus currentStatus;

    public InvalidInvoiceStatusException(Long invoiceId, InvoiceStatus currentStatus, String message) {
        super(String.format("Invoice [%s] in status [%s] cannot be modified: %s", invoiceId, currentStatus, message));
        this.invoiceId = invoiceId;
        this.currentStatus = currentStatus;
    }

    public InvalidInvoiceStatusException(String message) {
        super(message);
        this.invoiceId = null;
        this.currentStatus = null;
    }

    public Long getInvoiceId() {
        return invoiceId;
    }

    public InvoiceStatus getCurrentStatus() {
        return currentStatus;
    }
}
