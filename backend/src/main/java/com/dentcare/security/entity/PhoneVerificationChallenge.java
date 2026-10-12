package com.dentcare.security.entity;

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
 * JPA entity representing a persistent phone ownership verification challenge.
 *
 * Implements durable storage of verification attempts, MAC digests, lifecycle
 * states, and provenance (TEST vs LIVE). Plaintext OTP codes are never stored.
 */
@Entity
@Table(name = "phone_verification_challenges")
public class PhoneVerificationChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User reference is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Phone snapshot is required")
    @Size(max = 30, message = "Phone snapshot must not exceed 30 characters")
    @Column(name = "phone_snapshot", nullable = false, length = 30)
    private String phoneSnapshot;

    @NotBlank(message = "OTP MAC digest is required")
    @Size(max = 128, message = "OTP MAC digest must not exceed 128 characters")
    @Column(name = "otp_mac", nullable = false, length = 128)
    private String otpMac;

    @NotNull(message = "Challenge status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private PhoneVerificationChallengeStatus status = PhoneVerificationChallengeStatus.CREATED;

    @NotNull(message = "Delivery mode is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", nullable = false, length = 20)
    private PhoneVerificationDeliveryMode deliveryMode;

    @Min(value = 0, message = "Attempt count cannot be negative")
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Min(value = 1, message = "Max attempts must be at least 1")
    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 3;

    @NotNull(message = "Expiration timestamp is required")
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PhoneVerificationChallenge() {
    }

    public PhoneVerificationChallenge(
            User user,
            String phoneSnapshot,
            String otpMac,
            PhoneVerificationDeliveryMode deliveryMode,
            LocalDateTime expiresAt
    ) {
        this.user = user;
        this.phoneSnapshot = phoneSnapshot;
        this.otpMac = otpMac;
        this.deliveryMode = deliveryMode;
        this.expiresAt = expiresAt;
        this.status = PhoneVerificationChallengeStatus.CREATED;
        this.attemptCount = 0;
        this.maxAttempts = 3;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getPhoneSnapshot() {
        return phoneSnapshot;
    }

    public void setPhoneSnapshot(String phoneSnapshot) {
        this.phoneSnapshot = phoneSnapshot;
    }

    public String getOtpMac() {
        return otpMac;
    }

    public void setOtpMac(String otpMac) {
        this.otpMac = otpMac;
    }

    public PhoneVerificationChallengeStatus getStatus() {
        return status;
    }

    public void setStatus(PhoneVerificationChallengeStatus status) {
        this.status = status;
    }

    public PhoneVerificationDeliveryMode getDeliveryMode() {
        return deliveryMode;
    }

    public void setDeliveryMode(PhoneVerificationDeliveryMode deliveryMode) {
        this.deliveryMode = deliveryMode;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(int attemptCount) {
        this.attemptCount = attemptCount;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
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

    @Override
    public String toString() {
        return "PhoneVerificationChallenge{" +
                "id=" + id +
                ", userId=" + (user != null ? user.getId() : null) +
                ", phoneSnapshot='" + phoneSnapshot + '\'' +
                ", status=" + status +
                ", deliveryMode=" + deliveryMode +
                ", attemptCount=" + attemptCount +
                ", maxAttempts=" + maxAttempts +
                ", expiresAt=" + expiresAt +
                ", submittedAt=" + submittedAt +
                ", verifiedAt=" + verifiedAt +
                ", createdAt=" + createdAt +
                '}';
    }
}
