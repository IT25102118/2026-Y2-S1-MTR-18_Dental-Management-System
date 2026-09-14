package com.dentcare.billing.service;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;

import java.util.List;

/**
 * Service interface governing patient payment recording and financial history (MF-05).
 */
public interface PaymentService {

    /**
     * Records a full or partial payment against an issued invoice in UNPAID or PARTIALLY_PAID status.
     * Enforces overpayment checks (BR-10), derives paid amount and remaining balance from
     * authoritative recorded payment history, and updates invoice lifecycle status to PARTIALLY_PAID or PAID.
     *
     * @param invoiceId        database identifier of the issued invoice
     * @param request          payment details (amount, payment method, optional reference)
     * @param recordedByUserId trusted user ID of the authenticated staff member recording the payment
     * @return safe response representation of the persisted payment
     */
    PaymentResponse recordPayment(Long invoiceId, RecordPaymentRequest request, Long recordedByUserId);

    /**
     * Retrieves all payment transactions recorded against a specific invoice in chronological order.
     * Preserves complete historical audit trail without filtering out reversed payments.
     *
     * @param invoiceId database identifier of the invoice
     * @return list of chronological payment responses
     */
    List<PaymentResponse> getPaymentsForInvoice(Long invoiceId);
}
