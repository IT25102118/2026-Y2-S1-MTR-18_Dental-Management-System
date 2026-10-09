package com.dentcare.appointment.entity;

import com.dentcare.security.entity.User;
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
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing a patient-requested dental appointment.
 * Linked authoritatively to the patient's User account to enforce session-derived ownership.
 */
@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Patient is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dentist_id")
    private User dentist;

    @NotNull(message = "Appointment date is required")
    @FutureOrPresent(message = "Appointment date cannot be earlier than today")
    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @Size(max = 30, message = "Preferred time cannot exceed 30 characters")
    @Column(name = "preferred_time", length = 30)
    private String preferredTime;

    @NotBlank(message = "Reason for visit is required")
    @Size(max = 255, message = "Reason cannot exceed 255 characters")
    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Column(name = "sms_consent", nullable = false)
    private boolean smsConsent = false;

    @Column(name = "sms_consent_at")
    private LocalDateTime smsConsentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Appointment() {
    }

    public Appointment(User patient, LocalDate appointmentDate, String preferredTime, String reason, String notes) {
        this.patient = patient;
        this.appointmentDate = appointmentDate;
        this.preferredTime = preferredTime;
        this.reason = reason;
        this.notes = notes;
        this.status = AppointmentStatus.PENDING;
        this.smsConsent = false;
        this.smsConsentAt = null;
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
        if (!this.smsConsent) {
            this.smsConsentAt = null;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (!this.smsConsent) {
            this.smsConsentAt = null;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getPatient() {
        return patient;
    }

    public void setPatient(User patient) {
        this.patient = patient;
    }

    public User getDentist() {
        return dentist;
    }

    public void setDentist(User dentist) {
        this.dentist = dentist;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDate appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public String getPreferredTime() {
        return preferredTime;
    }

    public void setPreferredTime(String preferredTime) {
        this.preferredTime = preferredTime;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public void setStatus(AppointmentStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public boolean isSmsConsent() {
        return smsConsent;
    }

    public void setSmsConsent(boolean smsConsent) {
        this.smsConsent = smsConsent;
        if (!smsConsent) {
            this.smsConsentAt = null;
        }
    }

    public LocalDateTime getSmsConsentAt() {
        return smsConsentAt;
    }

    public void setSmsConsentAt(LocalDateTime smsConsentAt) {
        this.smsConsentAt = this.smsConsent ? smsConsentAt : null;
    }
}
