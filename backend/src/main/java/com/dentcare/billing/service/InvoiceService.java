package com.dentcare.billing.service;

import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;

/**
 * Service interface governing patient invoice creation, drafting, calculation, and issuance (MF-05).
 */
public interface InvoiceService {

    /**
     * Creates an initial invoice draft with server-derived line totals, subtotal, total, and balance.
     * Newly created invoices always have an initial status of DRAFT.
     *
     * @param request creation parameters
     * @return safe response representation of the persisted draft invoice
     */
    InvoiceResponse createDraft(CreateInvoiceRequest request);

    /**
     * Updates editable line items and discount information for an existing invoice in DRAFT status.
     * Re-executes authoritative calculations across all line items and invoice totals.
     *
     * @param invoiceId database identifier of the draft invoice
     * @param request   update parameters
     * @return updated draft invoice response
     */
    InvoiceResponse updateDraft(Long invoiceId, UpdateDraftInvoiceRequest request);

    /**
     * Retrieves an invoice by its primary database ID.
     *
     * @param invoiceId database identifier
     * @return safe invoice response with itemized details and payment history
     */
    InvoiceResponse getInvoice(Long invoiceId);

    /**
     * Retrieves an invoice by its unique business invoice number.
     *
     * @param invoiceNumber unique business identifier
     * @return safe invoice response
     */
    InvoiceResponse getInvoiceByNumber(String invoiceNumber);

    /**
     * Finalizes and issues a DRAFT invoice, transitioning its status to UNPAID (BR-09).
     * Requires at least one line item and performs final recalculation immediately before issuance.
     *
     * @param invoiceId database identifier of the draft invoice to issue
     * @return issued invoice response with UNPAID status
     */
    InvoiceResponse issueInvoice(Long invoiceId);

    /**
     * Cancels an existing invoice, transitioning its status to CANCELLED (FR-BIL-05, BR-11, BR-14).
     * Enforces that no active RECORDED payments exist before allowing cancellation.
     * Preserves invoice details, line items, and payment history without physical deletion.
     *
     * @param invoiceId database identifier of the invoice to cancel
     * @return safe response representation of the cancelled invoice
     */
    InvoiceResponse cancelInvoice(Long invoiceId);
}
