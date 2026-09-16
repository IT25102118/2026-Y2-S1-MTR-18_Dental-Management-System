package com.dentcare.billing.service;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.dto.ReversePaymentRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidBillingAmountException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvalidPaymentStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.PaymentNotFoundException;
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

        // Normalize before validation and persistence so lifecycle decisions match DECIMAL(10,2) storage.
        BigDecimal normalizedPaymentAmount = billingCalculationService.normalizeMoney(request.getAmount());
        billingCalculationService.validatePaymentAmount(normalizedPaymentAmount, currentBalance);

        // Create and persist new payment record
        String paymentNumber = generateUniquePaymentNumber();
        LocalDateTime paidAt = LocalDateTime.now();
        String paymentReference = request.getPaymentReference() != null ? request.getPaymentReference().trim() : null;

        Payment payment = new Payment(
                invoice,
                paymentNumber,
                normalizedPaymentAmount,
                request.getPaymentMethod(),
                paymentReference,
                paidAt,
                recordedByUserId
        );
        payment.setStatus(PaymentStatus.RECORDED);
        Payment savedPayment = paymentRepository.save(payment);

        // Derive new invoice financial state and lifecycle progression
        BigDecimal newPaidAmount = billingCalculationService.normalizePaidAmount(
                authoritativePaid.add(normalizedPaymentAmount)
        );
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

    @Override
    @Transactional
    public PaymentResponse reversePayment(Long paymentId, String reason, Long reversedByUserId) {
        if (paymentId == null) {
            throw new BillingValidationException("Payment ID is required");
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new BillingValidationException("Reversal reason is required and cannot be blank");
        }
        if (reversedByUserId == null) {
            throw new BillingValidationException("Reversed by user ID is required");
        }

        // Lock the payment before inspecting its status or reversal link. Concurrent reversal
        // requests serialize here, so only the first request can observe RECORDED state.
        Payment originalPayment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));

        if (originalPayment.getStatus() != PaymentStatus.RECORDED) {
            throw new InvalidPaymentStatusException(
                    paymentId,
                    originalPayment.getStatus(),
                    "Only RECORDED payments can be reversed"
            );
        }

        if (paymentRepository.existsByReversalOfPaymentId(paymentId)) {
            throw new InvalidPaymentStatusException(
                    paymentId,
                    originalPayment.getStatus(),
                    "Payment has already been reversed"
            );
        }

        Invoice invoiceRef = originalPayment.getInvoice();
        if (invoiceRef == null || invoiceRef.getId() == null) {
            throw new BillingValidationException("Payment is not associated with a valid invoice");
        }

        // Lock parent invoice with pessimistic lock to prevent concurrent balance corruption
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceRef.getId())
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceRef.getId()));

        String cleanReason = reason.trim();

        // 1. Mark original payment as REVERSED and attach reversal reason
        originalPayment.setStatus(PaymentStatus.REVERSED);
        originalPayment.setReversalReason(cleanReason);
        paymentRepository.save(originalPayment);

        // 2. Persist linked reversing compensating record
        String reversalNumber = generateUniquePaymentNumber();
        LocalDateTime reversalTime = LocalDateTime.now();
        Payment reversal = new Payment(
                invoice,
                reversalNumber,
                billingCalculationService.normalizeMoney(originalPayment.getAmount()),
                originalPayment.getPaymentMethod(),
                originalPayment.getPaymentReference(),
                reversalTime,
                reversedByUserId
        );
        reversal.setStatus(PaymentStatus.REVERSED);
        reversal.setReversalOfPaymentId(originalPayment.getId());
        reversal.setReversalReason(cleanReason);
        Payment savedReversal = paymentRepository.save(reversal);

        // 3. Recompute authoritative recorded-payment sum (REVERSED payments are strictly excluded)
        BigDecimal rawRecordedSum = paymentRepository.sumRecordedPaymentsByInvoiceId(invoice.getId());
        BigDecimal newPaidAmount = billingCalculationService.normalizePaidAmount(rawRecordedSum);
        BigDecimal newBalance = billingCalculationService.calculateBalance(invoice.getTotalAmount(), newPaidAmount);

        invoice.setPaidAmount(newPaidAmount);
        invoice.setBalanceAmount(newBalance);

        // 4. Derive invoice status according to canonical correction rules (preserve CANCELLED if applicable)
        if (invoice.getStatus() != InvoiceStatus.CANCELLED) {
            if (newPaidAmount.compareTo(BigDecimal.ZERO) == 0) {
                invoice.setStatus(InvoiceStatus.UNPAID);
            } else if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
                invoice.setStatus(InvoiceStatus.PAID);
            } else {
                invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
            }
        }

        invoiceRepository.save(invoice);

        return billingMapper.toPaymentResponse(savedReversal);
    }

    @Override
    @Transactional
    public PaymentResponse reversePayment(Long paymentId, ReversePaymentRequest request, Long reversedByUserId) {
        if (request == null) {
            throw new BillingValidationException("Reverse payment request is required");
        }
        return reversePayment(paymentId, request.getReason(), reversedByUserId);
    }

    private String generateUniquePaymentNumber() {
        String paymentNumber;
        do {
            paymentNumber = paymentNumberGenerator.generate();
        } while (paymentRepository.existsByPaymentNumber(paymentNumber));
        return paymentNumber;
    }
}
