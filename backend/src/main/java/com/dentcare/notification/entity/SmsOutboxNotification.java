package com.dentcare.notification.entity;

import com.dentcare.appointment.entity.Appointment;
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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * JPA entity representing a persistent transactional outbox notification intent.
 * Used for durable, asynchronous SMS delivery decoupled from booking transactions.
 */
@Entity
@Table(name = "sms_outbox_notifications")
public class SmsOutboxNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Idempotency key is required")
    @Size(max = 128, message = "Idempotency key must not exceed 128 characters")
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
    private String idempotencyKey;

    @NotNull(message = "Appointment reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @NotBlank(message = "Recipient phone number is required")
    @Size(max = 30, message = "Recipient phone must not exceed 30 characters")
    @Column(name = "recipient_phone", nullable = false, length = 30)
    private String recipientPhone;

    @NotBlank(message = "Message body is required")
    @Size(max = 500, message = "Message body must not exceed 500 characters")
    @Column(name = "message_body", nullable = false, length = 500)
    private String messageBody;

    @NotNull(message = "Notification status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private NotificationStatus status = NotificationStatus.PENDING;

    @NotNull(message = "Retry count is required")
    @Min(value = 0, message = "Retry count must not be negative")
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    @NotNull(message = "Max retries is required")
    @Min(value = 0, message = "Max retries must not be negative")
    @Column(name = "max_retries", nullable = false)
    private Integer maxRetries = 3;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Size(max = 50, message = "Provider name must not exceed 50 characters")
    @Column(name = "provider_name", length = 50)
    private String providerName;

    @Size(max = 100, message = "Provider message ID must not exceed 100 characters")
    @Column(name = "provider_message_id", length = 100)
    private String providerMessageId;

    @Size(max = 50, message = "Last error category must not exceed 50 characters")
    @Column(name = "last_error_category", length = 50)
    private String lastErrorCategory;

    @Size(max = 500, message = "Last error message must not exceed 500 characters")
    @Column(name = "last_error_message", length = 500)
    private String lastErrorMessage;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Size(max = 100, message = "Locked by identifier must not exceed 100 characters")
    @Column(name = "locked_by", length = 100)
    private String lockedBy;

    @Column(name = "consent_obtained", nullable = false)
    private boolean consentObtained = false;

    @Column(name = "consent_timestamp")
    private LocalDateTime consentTimestamp;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SmsOutboxNotification() {
    }

    public SmsOutboxNotification(String idempotencyKey,
                                 Appointment appointment,
                                 String recipientPhone,
                                 String messageBody,
                                 boolean consentObtained,
                                 LocalDateTime consentTimestamp) {
        this.idempotencyKey = idempotencyKey;
        this.appointment = appointment;
        this.recipientPhone = recipientPhone;
        this.messageBody = messageBody;
        this.consentObtained = consentObtained;
        this.consentTimestamp = consentObtained ? consentTimestamp : null;
        this.status = NotificationStatus.PENDING;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (retryCount == null) {
            retryCount = 0;
        }
        if (maxRetries == null) {
            maxRetries = 3;
        }
        if (status == null) {
            status = NotificationStatus.PENDING;
        }
        if (!consentObtained) {
            consentTimestamp = null;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (!consentObtained) {
            consentTimestamp = null;
        }
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public void setAppointment(Appointment appointment) {
        this.appointment = appointment;
    }

    public String getRecipientPhone() {
        return recipientPhone;
    }

    public void setRecipientPhone(String recipientPhone) {
        this.recipientPhone = recipientPhone;
    }

    public String getMessageBody() {
        return messageBody;
    }

    public void setMessageBody(String messageBody) {
        this.messageBody = messageBody;
    }

    public NotificationStatus getStatus() {
        return status;
    }

    public void setStatus(NotificationStatus status) {
        this.status = status;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }

    public Integer getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(Integer maxRetries) {
        this.maxRetries = maxRetries;
    }

    public LocalDateTime getNextRetryAt() {
        return nextRetryAt;
    }

    public void setNextRetryAt(LocalDateTime nextRetryAt) {
        this.nextRetryAt = nextRetryAt;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public String getProviderMessageId() {
        return providerMessageId;
    }

    public void setProviderMessageId(String providerMessageId) {
        this.providerMessageId = providerMessageId;
    }

    public String getLastErrorCategory() {
        return lastErrorCategory;
    }

    public void setLastErrorCategory(String lastErrorCategory) {
        this.lastErrorCategory = lastErrorCategory;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public void setLastErrorMessage(String lastErrorMessage) {
        this.lastErrorMessage = lastErrorMessage;
    }

    public LocalDateTime getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(LocalDateTime lockedAt) {
        this.lockedAt = lockedAt;
    }

    public String getLockedBy() {
        return lockedBy;
    }

    public void setLockedBy(String lockedBy) {
        this.lockedBy = lockedBy;
    }

    public boolean isConsentObtained() {
        return consentObtained;
    }

    public void setConsentObtained(boolean consentObtained) {
        this.consentObtained = consentObtained;
        if (!consentObtained) {
            this.consentTimestamp = null;
        }
    }

    public LocalDateTime getConsentTimestamp() {
        return consentTimestamp;
    }

    public void setConsentTimestamp(LocalDateTime consentTimestamp) {
        this.consentTimestamp = this.consentObtained ? consentTimestamp : null;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
