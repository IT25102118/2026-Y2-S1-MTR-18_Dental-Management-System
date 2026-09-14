package com.dentcare.billing.controller;

import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;
import com.dentcare.billing.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * REST controller managing invoice creation, draft modification, retrieval, issuance, and cancellation (MF-05).
 * Thin controller layer: delegates authoritative business logic, calculation, and lifecycle transitions to InvoiceService.
 */
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    public ResponseEntity<InvoiceResponse> createDraft(@Valid @RequestBody CreateInvoiceRequest request) {
        InvoiceResponse created = invoiceService.createDraft(request);
        URI location = URI.create("/api/invoices/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvoiceResponse> updateDraft(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDraftInvoiceRequest request
    ) {
        return ResponseEntity.ok(invoiceService.updateDraft(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getInvoiceById(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoice(id));
    }

    @GetMapping("/by-number/{invoiceNumber}")
    public ResponseEntity<InvoiceResponse> getInvoiceByNumber(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(invoiceService.getInvoiceByNumber(invoiceNumber));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<InvoiceResponse> issueInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.issueInvoice(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<InvoiceResponse> cancelInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.cancelInvoice(id));
    }
}