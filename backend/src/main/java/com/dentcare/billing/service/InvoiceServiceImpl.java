package com.dentcare.billing.service;

import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.InvoiceItemRequest;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Production implementation of {@link InvoiceService} orchestrating invoice drafting,
 * recalculation, issuance, and cancellation.
 */
@Service
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final BillingCalculationService billingCalculationService;
    private final BillingMapper billingMapper;
    private final InvoiceNumberGenerator invoiceNumberGenerator;

    public InvoiceServiceImpl(InvoiceRepository invoiceRepository,
                              PaymentRepository paymentRepository,
                              BillingCalculationService billingCalculationService,
                              BillingMapper billingMapper,
                              InvoiceNumberGenerator invoiceNumberGenerator) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.billingCalculationService = billingCalculationService;
        this.billingMapper = billingMapper;
        this.invoiceNumberGenerator = invoiceNumberGenerator;
    }

    @Override
    @Transactional
    public InvoiceResponse createDraft(CreateInvoiceRequest request) {
        if (request == null) {
            throw new BillingValidationException("Create invoice request is required");
        }
        if (request.getPatientId() == null) {
            throw new BillingValidationException("Patient ID is required");
        }

        String invoiceNumber = generateUniqueInvoiceNumber();
        LocalDate invoiceDate = request.getInvoiceDate() != null ? request.getInvoiceDate() : LocalDate.now();

        Invoice invoice = new Invoice(invoiceNumber, request.getPatientId(), invoiceDate);
        invoice.setTreatmentPlanId(request.getTreatmentPlanId());
        invoice.setNotes(request.getNotes());
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setDiscountAmount(request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO);

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (InvoiceItemRequest itemReq : request.getItems()) {
                if (itemReq != null) {
                    BigDecimal lineTotal = billingCalculationService.calculateLineTotal(itemReq.getQuantity(), itemReq.getUnitPrice());
                    InvoiceItem item = new InvoiceItem(
                            invoice,
                            itemReq.getTreatmentProcedureId(),
                            itemReq.getDescription(),
                            itemReq.getQuantity(),
                            itemReq.getUnitPrice(),
                            lineTotal
                    );
                    invoice.addItem(item);
                }
            }
        }

        billingCalculationService.recalculateInvoiceTotals(invoice, BigDecimal.ZERO);

        Invoice saved = invoiceRepository.save(invoice);
        return billingMapper.toInvoiceResponse(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse updateDraft(Long invoiceId, UpdateDraftInvoiceRequest request) {
        if (invoiceId == null) {
            throw new BillingValidationException("Invoice ID is required");
        }
        if (request == null) {
            throw new BillingValidationException("Update draft invoice request is required");
        }

        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new InvalidInvoiceStatusException(invoiceId, invoice.getStatus(), "Only DRAFT invoices can be updated");
        }

        if (request.getTreatmentPlanId() != null) {
            invoice.setTreatmentPlanId(request.getTreatmentPlanId());
        }
        if (request.getInvoiceDate() != null) {
            invoice.setInvoiceDate(request.getInvoiceDate());
        }
        if (request.getNotes() != null) {
            invoice.setNotes(request.getNotes());
        }
        if (request.getDiscountAmount() != null) {
            invoice.setDiscountAmount(request.getDiscountAmount());
        }

        if (request.getItems() != null) {
            invoice.getItems().clear();
            for (InvoiceItemRequest itemReq : request.getItems()) {
                if (itemReq != null) {
                    BigDecimal lineTotal = billingCalculationService.calculateLineTotal(itemReq.getQuantity(), itemReq.getUnitPrice());
                    InvoiceItem item = new InvoiceItem(
                            invoice,
                            itemReq.getTreatmentProcedureId(),
                            itemReq.getDescription(),
                            itemReq.getQuantity(),
                            itemReq.getUnitPrice(),
                            lineTotal
                    );
                    invoice.addItem(item);
                }
            }
        }

        BigDecimal currentPaid = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
        billingCalculationService.recalculateInvoiceTotals(invoice, currentPaid);

        Invoice saved = invoiceRepository.save(invoice);
        return billingMapper.toInvoiceResponse(saved);
    }

    @Override
    public InvoiceResponse getInvoice(Long invoiceId) {
        if (invoiceId == null) {
            throw new BillingValidationException("Invoice ID is required");
        }
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        return billingMapper.toInvoiceResponse(invoice);
    }

    @Override
    public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
        if (invoiceNumber == null || invoiceNumber.trim().isEmpty()) {
            throw new BillingValidationException("Invoice number is required");
        }
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber.trim())
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceNumber.trim()));
        return billingMapper.toInvoiceResponse(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse issueInvoice(Long invoiceId) {
        if (invoiceId == null) {
            throw new BillingValidationException("Invoice ID is required");
        }

        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new InvalidInvoiceStatusException(invoiceId, invoice.getStatus(), "Only DRAFT invoices can be issued");
        }

        if (invoice.getItems() == null || invoice.getItems().isEmpty()) {
            throw new BillingValidationException("Invoice must contain at least one line item before it can be issued (BR-09)");
        }

        // Final authoritative recalculation immediately prior to status transition
        for (InvoiceItem item : invoice.getItems()) {
            item.setLineTotal(billingCalculationService.calculateLineTotal(item.getQuantity(), item.getUnitPrice()));
        }
        BigDecimal currentPaid = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;
        billingCalculationService.recalculateInvoiceTotals(invoice, currentPaid);

        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setIssuedAt(LocalDateTime.now());

        Invoice saved = invoiceRepository.save(invoice);
        return billingMapper.toInvoiceResponse(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse cancelInvoice(Long invoiceId) {
        if (invoiceId == null) {
            throw new BillingValidationException("Invoice ID is required");
        }

        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new InvalidInvoiceStatusException(invoiceId, invoice.getStatus(), "Invoice is already cancelled");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new InvalidInvoiceStatusException(
                    invoiceId,
                    invoice.getStatus(),
                    "Paid invoices cannot be directly cancelled; recorded payments must first be reversed"
            );
        }

        BigDecimal rawRecordedSum = paymentRepository.sumRecordedPaymentsByInvoiceId(invoiceId);
        BigDecimal activePaidAmount = billingCalculationService.normalizePaidAmount(rawRecordedSum);

        if (activePaidAmount.compareTo(BigDecimal.ZERO) > 0) {
            throw new InvalidInvoiceStatusException(
                    invoiceId,
                    invoice.getStatus(),
                    "Invoice cannot be cancelled while active recorded payments remain; recorded payments must first be reversed"
            );
        }

        // Reconcile paidAmount and balanceAmount if stale
        if (invoice.getPaidAmount() == null || invoice.getPaidAmount().compareTo(activePaidAmount) != 0) {
            invoice.setPaidAmount(activePaidAmount);
            invoice.setBalanceAmount(invoice.getTotalAmount());
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);

        Invoice saved = invoiceRepository.save(invoice);
        return billingMapper.toInvoiceResponse(saved);
    }

    private String generateUniqueInvoiceNumber() {
        String invoiceNumber;
        do {
            invoiceNumber = invoiceNumberGenerator.generate();
        } while (invoiceRepository.existsByInvoiceNumber(invoiceNumber));
        return invoiceNumber;
    }
}
