package com.dentcare.billing.controller;

import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.service.ReceiptService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller providing authoritative receipt data for recorded payments (MF-05 / FR-BIL-07).
 * Thin, read-only controller layer: delegates receipt retrieval to {@link ReceiptService}.
 */
@RestController
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @GetMapping("/api/payments/{paymentId}/receipt")
    public ResponseEntity<ReceiptResponse> getReceiptForPayment(@PathVariable Long paymentId) {
        ReceiptResponse receipt = receiptService.getReceiptForPayment(paymentId);
        return ResponseEntity.ok(receipt);
    }
}
