package com.dentcare.billing.service;

import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.PaymentNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Production implementation of {@link ReceiptService} providing authoritative receipt data (FR-BIL-07).
 * Strictly read-only: retrieves persisted payment and invoice records without mutating state.
 */
@Service
@Transactional(readOnly = true)
public class ReceiptServiceImpl implements ReceiptService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final BillingMapper billingMapper;

    public ReceiptServiceImpl(PaymentRepository paymentRepository,
                              InvoiceRepository invoiceRepository,
                              BillingMapper billingMapper) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.billingMapper = billingMapper;
    }

    @Override
    public ReceiptResponse getReceiptForPayment(Long paymentId) {
        if (paymentId == null) {
            throw new BillingValidationException("Payment ID is required");
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));

        Invoice invoice = payment.getInvoice();
        if (invoice == null || invoice.getId() == null) {
            throw new BillingValidationException("Payment is not associated with a valid invoice");
        }

        Long invoiceId = invoice.getId();
        Invoice resolvedInvoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        return billingMapper.toReceiptResponse(payment, resolvedInvoice);
    }
}
