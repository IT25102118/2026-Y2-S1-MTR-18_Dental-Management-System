package com.dentcare.billing.exception;

/**
 * Exception thrown when an invoice cannot be found by its database identifier or business invoice number.
 */
public class InvoiceNotFoundException extends RuntimeException {

    private final Long invoiceId;
    private final String invoiceNumber;

    public InvoiceNotFoundException(Long invoiceId) {
        super("Invoice not found with id: " + invoiceId);
        this.invoiceId = invoiceId;
        this.invoiceNumber = null;
    }

    public InvoiceNotFoundException(String invoiceNumber) {
        super("Invoice not found with invoice number: " + invoiceNumber);
        this.invoiceId = null;
        this.invoiceNumber = invoiceNumber;
    }

    public Long getInvoiceId() {
        return invoiceId;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }
}
