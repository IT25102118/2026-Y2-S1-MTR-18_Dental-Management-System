package com.dentcare.billing.service;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidBillingAmountException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Production implementation of {@link PaymentService} orchestrating full and partial
 * payment recording, balance derivation, and invoice lifecycle progression.
 */
@Service
@Transactional(readOnly = true)
public class PaymentServiceImpl implements PaymentService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final BillingCalculationService billingCalculationService;
    private final BillingMapper billingMapper;
    private final PaymentNumberGenerator paymentNumberGenerator;

    public PaymentServiceImpl(InvoiceRepository invoiceRepository,
                              PaymentRepository paymentRepository,
                              BillingCalculationService billingCalculationService,
                              BillingMapper billingMapper,
                              PaymentNumberGenerator paymentNumberGenerator) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.billingCalculationService = billingCalculationService;
        this.billingMapper = billingMapper;
        this.paymentNumberGenerator = paymentNumberGenerator;
    }

    @Override
    @Transactional
    public PaymentResponse recordPayment(Long invoiceId, RecordPaymentRequest request, Long recordedByUserId) {
        if (invoiceId == null) {
            throw new BillingValidationException("Invoice ID is required");
        }
        if (request == null) {
            throw new BillingValidationException("Record payment request is required");
        }
        if (recordedByUserId == null) {
            throw new BillingValidationException("Recorded by user ID is required");
        }
        if (request.getPaymentMethod() == null) {
            throw new BillingValidationException("Payment method is required");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidBillingAmountException("Payment amount must be strictly greater than zero");
        }

        // Acquire pessimistic lock on the parent invoice to prevent concurrent balance corruption
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        if (invoice.getStatus() != InvoiceStatus.UNPAID && invoice.getStatus() != InvoiceStatus.PARTIALLY_PAID) {
            throw new InvalidInvoiceStatusException(
                    invoiceId,
                    invoice.getStatus(),
                    "Payment can only be recorded on UNPAID or PARTIALLY_PAID invoices"
            );
        }

        // Derive authoritative existing recorded payments (REVERSED payments are strictly excluded)
        BigDecimal rawRecordedSum = paymentRepository.sumRecordedPaymentsByInvoiceId(invoiceId);
        BigDecimal authoritativePaid = billingCalculationService.normalizePaidAmount(rawRecordedSum);
        BigDecimal currentBalance = billingCalculationService.calculateBalance(invoice.getTotalAmount(), authoritativePaid);

        // Validate payment amount against authoritative remaining balance before persistence
        billingCalculationService.validatePaymentAmount(request.getAmount(), currentBalance);

        // Create and persist new payment record
        String paymentNumber = generateUniquePaymentNumber();
        LocalDateTime paidAt = LocalDateTime.now();
        String paymentReference = request.getPaymentReference() != null ? request.getPaymentReference().trim() : null;

        Payment payment = new Payment(
                invoice,
                paymentNumber,
                request.getAmount(),
                request.getPaymentMethod(),
                paymentReference,
                paidAt,
                recordedByUserId
        );
        payment.setStatus(PaymentStatus.RECORDED);
        Payment savedPayment = paymentRepository.save(payment);

        // Derive new invoice financial state and lifecycle progression
        BigDecimal newPaidAmount = authoritativePaid.add(request.getAmount());
        BigDecimal newBalance = billingCalculationService.calculateBalance(invoice.getTotalAmount(), newPaidAmount);

        invoice.setPaidAmount(newPaidAmount);
        invoice.setBalanceAmount(newBalance);

        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        invoiceRepository.save(invoice);

        return billingMapper.toPaymentResponse(savedPayment);
    }

    @Override
    public List<PaymentResponse> getPaymentsForInvoice(Long invoiceId) {
        if (invoiceId == null) {
            throw new BillingValidationException("Invoice ID is required");
        }
        if (!invoiceRepository.existsById(invoiceId)) {
            throw new InvoiceNotFoundException(invoiceId);
        }
        List<Payment> payments = paymentRepository.findByInvoiceIdOrderByPaidAtAscIdAsc(invoiceId);
        return billingMapper.toPaymentResponses(payments);
    }

    private String generateUniquePaymentNumber() {
        String paymentNumber;
        do {
            paymentNumber = paymentNumberGenerator.generate();
        } while (paymentRepository.existsByPaymentNumber(paymentNumber));
        return paymentNumber;
    }
}
