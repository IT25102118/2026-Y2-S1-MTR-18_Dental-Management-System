package com.dentcare.billing.mapper;

import com.dentcare.billing.dto.InvoiceItemResponse;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.Payment;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Authoritative billing mapper following repository conventions.
 * Pure mapping layer:
 * - No repository calls
 * - No service calls
 * - No database mutations
 * - No financial recalculation
 * - No status transitions
 * - No authorization logic
 * - Safely handles nullable optional treatment references and reversal links
 * - Avoids infinite recursion from JPA bidirectional relationships
 */
@Component
public class BillingMapper {

    public InvoiceItemResponse toItemResponse(InvoiceItem item) {
        return InvoiceItemResponse.fromEntity(item);
    }

    public List<InvoiceItemResponse> toItemResponses(List<InvoiceItem> items) {
        if (items == null || items.isEmpty()) {
            return Collections.emptyList();
        }
        return items.stream()
                .map(this::toItemResponse)
                .toList();
    }

    public PaymentResponse toPaymentResponse(Payment payment) {
        return PaymentResponse.fromEntity(payment);
    }

    public List<PaymentResponse> toPaymentResponses(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) {
            return Collections.emptyList();
        }
        return payments.stream()
                .map(this::toPaymentResponse)
                .toList();
    }

    public InvoiceResponse toInvoiceResponse(Invoice invoice) {
        return InvoiceResponse.fromEntity(invoice);
    }

    public List<InvoiceResponse> toInvoiceResponses(List<Invoice> invoices) {
        if (invoices == null || invoices.isEmpty()) {
            return Collections.emptyList();
        }
        return invoices.stream()
                .map(this::toInvoiceResponse)
                .toList();
    }

    public ReceiptResponse toReceiptResponse(Payment payment) {
        return ReceiptResponse.from(payment);
    }

    public ReceiptResponse toReceiptResponse(Payment payment, Invoice invoice) {
        return ReceiptResponse.from(payment, invoice);
    }
}
