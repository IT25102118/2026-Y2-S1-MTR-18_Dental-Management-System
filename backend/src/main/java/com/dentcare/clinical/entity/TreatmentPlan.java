package com.dentcare.clinical.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity representing a patient treatment plan in DentCare.
 * Maps directly to table 'treatment_plans'.
 */
@Entity
@Table(name = "treatment_plans")
public class TreatmentPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Patient ID is required")
    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @NotNull(message = "Dentist ID is required")
    @Column(name = "dentist_id", nullable = false)
    private Long dentistId;

    @Column(name = "examination_id")
    private Long examinationId;

    @NotNull(message = "Created-by user ID is required")
    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @NotBlank(message = "Plan name is required")
    @Size(max = 150, message = "Plan name cannot exceed 150 characters")
    @Column(name = "plan_name", nullable = false, length = 150)
    private String planName;

    @NotNull(message = "Treatment plan status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TreatmentPlanStatus status = TreatmentPlanStatus.PROPOSED;

    @NotNull(message = "Total estimated cost is required")
    @DecimalMin(value = "0.00", message = "Total estimated cost must be greater than or equal to zero")
    @Digits(integer = 10, fraction = 2, message = "Total estimated cost must have at most 10 integer digits and 2 decimal places")
    @Column(name = "total_estimated_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalEstimatedCost = BigDecimal.ZERO;

    @NotNull(message = "Total actual cost is required")
    @DecimalMin(value = "0.00", message = "Total actual cost must be greater than or equal to zero")
    @Digits(integer = 10, fraction = 2, message = "Total actual cost must have at most 10 integer digits and 2 decimal places")
    @Column(name = "total_actual_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalActualCost = BigDecimal.ZERO;

    @Column(name = "approved_by_dentist_id")
    private Long approvedByDentistId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Size(max = 255, message = "Cancellation reason cannot exceed 255 characters")
    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    public TreatmentPlan() {
    }

    public TreatmentPlan(Long patientId, Long dentistId, Long examinationId,
                         Long createdByUserId, String planName) {
        this.patientId = patientId;
        this.dentistId = dentistId;
        this.examinationId = examinationId;
        this.createdByUserId = createdByUserId;
        this.planName = planName;
        this.status = TreatmentPlanStatus.PROPOSED;
        this.totalEstimatedCost = BigDecimal.ZERO;
        this.totalActualCost = BigDecimal.ZERO;
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
        if (this.status == null) {
            this.status = TreatmentPlanStatus.PROPOSED;
        }
        if (this.totalEstimatedCost == null) {
            this.totalEstimatedCost = BigDecimal.ZERO;
        }
        if (this.totalActualCost == null) {
            this.totalActualCost = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public Long getDentistId() {
        return dentistId;
    }

    public void setDentistId(Long dentistId) {
        this.dentistId = dentistId;
    }

    public Long getExaminationId() {
        return examinationId;
    }

    public void setExaminationId(Long examinationId) {
        this.examinationId = examinationId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public TreatmentPlanStatus getStatus() {
        return status;
    }

    public void setStatus(TreatmentPlanStatus status) {
        this.status = status;
    }

    public BigDecimal getTotalEstimatedCost() {
        return totalEstimatedCost;
    }

    public void setTotalEstimatedCost(BigDecimal totalEstimatedCost) {
        this.totalEstimatedCost = totalEstimatedCost;
    }

    public BigDecimal getTotalActualCost() {
        return totalActualCost;
    }

    public void setTotalActualCost(BigDecimal totalActualCost) {
        this.totalActualCost = totalActualCost;
    }

    public Long getApprovedByDentistId() {
        return approvedByDentistId;
    }

    public void setApprovedByDentistId(Long approvedByDentistId) {
        this.approvedByDentistId = approvedByDentistId;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getClinicalNotes() {
        return clinicalNotes;
    }

    public void setClinicalNotes(String clinicalNotes) {
        this.clinicalNotes = clinicalNotes;
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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
