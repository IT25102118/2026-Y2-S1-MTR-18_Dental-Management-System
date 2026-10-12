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
import java.util.Objects;

/**
 * JPA entity representing a persistent transactional outbox notification intent.
 * Used for durable, asynchronous email delivery decoupled from appointment booking transactions.
 */
@Entity
@Table(name = "appointment_email_outbox")
public class AppointmentEmailNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Appointment reference is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @NotBlank(message = "Idempotency key is required")
    @Size(max = 128, message = "Idempotency key must not exceed 128 characters")
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
    private String idempotencyKey;

    @NotBlank(message = "Recipient email is required")
    @Size(max = 150, message = "Recipient email must not exceed 150 characters")
    @Column(name = "recipient_email", nullable = false, length = 150)
    private String recipientEmail;

    @NotBlank(message = "Email subject is required")
    @Size(max = 255, message = "Email subject must not exceed 255 characters")
    @Column(name = "email_subject", nullable = false, length = 255)
    private String emailSubject;

    @NotBlank(message = "Email body is required")
    @Column(name = "email_body", nullable = false, columnDefinition = "TEXT")
    private String emailBody;

    @NotNull(message = "Notification status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private EmailNotificationStatus status = EmailNotificationStatus.PENDING;

    @NotNull(message = "Attempt count is required")
    @Min(value = 0, message = "Attempt count must not be negative")
    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "next_retry_at")
    private LocalDateTime nextRetryAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Size(max = 500, message = "Last error must not exceed 500 characters")
    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Size(max = 128, message = "Worker identifier must not exceed 128 characters")
    @Column(name = "locked_by", length = 128)
    private String lockedBy;

    @Column(name = "lease_until")
    private LocalDateTime leaseUntil;

    @NotNull(message = "Maximum attempts is required")
    @Min(value = 1, message = "Maximum attempts must be at least 1")
    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts = 3;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public AppointmentEmailNotification() {
    }

    public AppointmentEmailNotification(
            Appointment appointment,
            String idempotencyKey,
            String recipientEmail,
            String emailSubject,
            String emailBody
    ) {
        this.appointment = appointment;
        this.idempotencyKey = idempotencyKey;
        this.recipientEmail = recipientEmail;
        this.emailSubject = emailSubject;
        this.emailBody = emailBody;
        this.status = EmailNotificationStatus.PENDING;
        this.attemptCount = 0;
        this.maxAttempts = 3;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (status == null) {
            status = EmailNotificationStatus.PENDING;
        }
        if (attemptCount == null) {
            attemptCount = 0;
        }
        if (maxAttempts == null) {
            maxAttempts = 3;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public void setAppointment(Appointment appointment) {
        this.appointment = appointment;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getEmailSubject() {
        return emailSubject;
    }

    public void setEmailSubject(String emailSubject) {
        this.emailSubject = emailSubject;
    }

    public String getEmailBody() {
        return emailBody;
    }

    public void setEmailBody(String emailBody) {
        this.emailBody = emailBody;
    }

    public EmailNotificationStatus getStatus() {
        return status;
    }

    public void setStatus(EmailNotificationStatus status) {
        this.status = status;
    }

    public Integer getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(Integer attemptCount) {
        this.attemptCount = attemptCount;
    }

    public LocalDateTime getNextRetryAt() {
        return nextRetryAt;
    }

    public void setNextRetryAt(LocalDateTime nextRetryAt) {
        this.nextRetryAt = nextRetryAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
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

    public LocalDateTime getLeaseUntil() {
        return leaseUntil;
    }

    public void setLeaseUntil(LocalDateTime leaseUntil) {
        this.leaseUntil = leaseUntil;
    }

    public Integer getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(Integer maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AppointmentEmailNotification that)) return false;
        return Objects.equals(idempotencyKey, that.idempotencyKey);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idempotencyKey);
    }

    @Override
    public String toString() {
        return "AppointmentEmailNotification{" +
                "id=" + id +
                ", idempotencyKey='" + idempotencyKey + '\'' +
                ", recipientEmail='" + recipientEmail + '\'' +
                ", emailSubject='" + emailSubject + '\'' +
                ", status=" + status +
                ", attemptCount=" + attemptCount +
                ", maxAttempts=" + maxAttempts +
                ", lockedAt=" + lockedAt +
                ", lockedBy='" + lockedBy + '\'' +
                ", leaseUntil=" + leaseUntil +
                ", createdAt=" + createdAt +
                '}';
    }
}

