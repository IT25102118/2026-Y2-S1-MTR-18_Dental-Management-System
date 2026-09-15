package com.dentcare.billing.controller;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.dto.ReversePaymentRequest;
import com.dentcare.billing.service.PaymentService;
import com.dentcare.security.model.DentCareUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/api/invoices/{invoiceId}/payments")
    public ResponseEntity<PaymentResponse> recordPayment(
            @PathVariable Long invoiceId,
            @Valid @RequestBody RecordPaymentRequest request,
            @AuthenticationPrincipal DentCareUserDetails userDetails
    ) {
        if (userDetails == null || userDetails.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        PaymentResponse response = paymentService.recordPayment(invoiceId, request, userDetails.getId());
        URI location = URI.create("/api/payments/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/api/invoices/{invoiceId}/payments")
    public ResponseEntity<List<PaymentResponse>> getPaymentsForInvoice(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(paymentService.getPaymentsForInvoice(invoiceId));
    }

    @PostMapping("/api/payments/{paymentId}/reverse")
    public ResponseEntity<PaymentResponse> reversePayment(
            @PathVariable Long paymentId,
            @Valid @RequestBody ReversePaymentRequest request,
            @AuthenticationPrincipal DentCareUserDetails userDetails
    ) {
        if (userDetails == null || userDetails.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        PaymentResponse response = paymentService.reversePayment(paymentId, request, userDetails.getId());
        return ResponseEntity.ok(response);
    }
}