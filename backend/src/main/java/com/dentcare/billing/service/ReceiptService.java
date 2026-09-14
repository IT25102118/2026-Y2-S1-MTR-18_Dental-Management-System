package com.dentcare.billing.service;

import com.dentcare.billing.dto.ReceiptResponse;

/**
 * Service interface governing authoritative payment receipt generation and retrieval (MF-05 / FR-BIL-07).
 */
public interface ReceiptService {

    /**
     * Generates and returns authoritative receipt data for a recorded or historical payment.
     * Pure read-only operation that maps persisted payment and parent invoice state
     * without mutating entities or creating additional records.
     *
     * @param paymentId database identifier of the payment
     * @return safe response representation of the payment receipt
     */
    ReceiptResponse getReceiptForPayment(Long paymentId);
}
