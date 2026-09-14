package com.dentcare.billing.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity representing a recorded financial payment against an Invoice in DentCare (MF-05).
 * Strictly records clinic counter/bank payments; does not interface with online payment gateways
 * and does not store sensitive cardholder details.
 */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Associated invoice is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @NotBlank(message = "Payment number is required")
    @Size(max = 50, message = "Payment number must not exceed 50 characters")
    @Column(name = "payment_number", nullable = false, unique = true, length = 50)
    private String paymentNumber;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be strictly greater than zero")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    /**
     * Optional non-sensitive external reference (e.g. POS terminal slip approval number or bank transfer reference).
     */
    @Size(max = 100, message = "Payment reference must not exceed 100 characters")
    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @NotNull(message = "Paid timestamp is required")
    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

    @NotNull(message = "Recorded by user ID is required")
    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;

    @NotNull(message = "Payment status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.RECORDED;

    @Column(name = "reversal_of_payment_id")
    private Long reversalOfPaymentId;

    @Size(max = 255, message = "Reversal reason must not exceed 255 characters")
    @Column(name = "reversal_reason", length = 255)
    private String reversalReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.paidAt == null) {
            this.paidAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = PaymentStatus.RECORDED;
        }
    }

    public Payment() {
    }

    public Payment(Invoice invoice, String paymentNumber, BigDecimal amount, PaymentMethod paymentMethod, String paymentReference, LocalDateTime paidAt, Long recordedBy) {
        this.invoice = invoice;
        this.paymentNumber = paymentNumber;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentReference = paymentReference;
        this.paidAt = paidAt;
        this.recordedBy = recordedBy;
        this.status = PaymentStatus.RECORDED;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public String getPaymentNumber() {
        return paymentNumber;
    }

    public void setPaymentNumber(String paymentNumber) {
        this.paymentNumber = paymentNumber;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public Long getRecordedBy() {
        return recordedBy;
    }

    public void setRecordedBy(Long recordedBy) {
        this.recordedBy = recordedBy;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public Long getReversalOfPaymentId() {
        return reversalOfPaymentId;
    }

    public void setReversalOfPaymentId(Long reversalOfPaymentId) {
        this.reversalOfPaymentId = reversalOfPaymentId;
    }

    public String getReversalReason() {
        return reversalReason;
    }

    public void setReversalReason(String reversalReason) {
        this.reversalReason = reversalReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
