package com.dentcare.billing.service;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.dto.ReversePaymentRequest;

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

    /**
     * Reverses an existing RECORDED payment transaction with an audit reason.
     * Transactionally locks the parent invoice, creates a linked reversing record, marks the
     * original payment as REVERSED, and recalculates the invoice's paid amount, balance, and status.
     *
     * @param paymentId        database identifier of the payment to reverse
     * @param reason           mandatory explanation for the financial reversal
     * @param reversedByUserId trusted user ID of the authenticated staff member authorizing the reversal
     * @return safe response representation of the newly created reversing payment record
     */
    PaymentResponse reversePayment(Long paymentId, String reason, Long reversedByUserId);

    /**
     * Reverses an existing RECORDED payment transaction using a structured request object.
     *
     * @param paymentId        database identifier of the payment to reverse
     * @param request          reversal request containing the audit reason
     * @param reversedByUserId trusted user ID of the authenticated staff member authorizing the reversal
     * @return safe response representation of the newly created reversing payment record
     */
    PaymentResponse reversePayment(Long paymentId, ReversePaymentRequest request, Long reversedByUserId);
}
