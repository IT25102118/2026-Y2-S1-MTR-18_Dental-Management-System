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
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing an individual treatment procedure in DentCare.
 * Maps directly to table 'treatment_procedures'.
 */
@Entity
@Table(name = "treatment_procedures")
public class TreatmentProcedure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Treatment plan ID is required")
    @Column(name = "treatment_plan_id", nullable = false)
    private Long treatmentPlanId;

    @Column(name = "tooth_number")
    private Integer toothNumber;

    @NotBlank(message = "Procedure name is required")
    @Size(max = 150, message = "Procedure name cannot exceed 150 characters")
    @Column(name = "procedure_name", nullable = false, length = 150)
    private String procedureName;

    @Size(max = 50, message = "Procedure code cannot exceed 50 characters")
    @Column(name = "procedure_code", length = 50)
    private String procedureCode;

    @NotNull(message = "Sequence number is required")
    @Min(value = 1, message = "Sequence number must be at least 1")
    @Column(name = "sequence_number", nullable = false)
    private Integer sequenceNumber = 1;

    @NotNull(message = "Procedure status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ProcedureStatus status = ProcedureStatus.PLANNED;

    @NotNull(message = "Estimated cost is required")
    @DecimalMin(value = "0.00", message = "Estimated cost must be greater than or equal to zero")
    @Digits(integer = 10, fraction = 2, message = "Estimated cost must have at most 10 integer digits and 2 decimal places")
    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedCost = BigDecimal.ZERO;

    @DecimalMin(value = "0.00", message = "Actual cost must be greater than or equal to zero")
    @Digits(integer = 10, fraction = 2, message = "Actual cost must have at most 10 integer digits and 2 decimal places")
    @Column(name = "actual_cost", precision = 12, scale = 2)
    private BigDecimal actualCost;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Column(name = "performed_by_dentist_id")
    private Long performedByDentistId;

    @Column(name = "assisted_by_user_id")
    private Long assistedByUserId;

    @Column(name = "clinical_progress_notes", columnDefinition = "TEXT")
    private String clinicalProgressNotes;

    @Size(max = 255, message = "Cancellation reason cannot exceed 255 characters")
    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public TreatmentProcedure() {
    }

    public TreatmentProcedure(Long treatmentPlanId, Integer toothNumber, String procedureName,
                              BigDecimal estimatedCost, Integer sequenceNumber) {
        this.treatmentPlanId = treatmentPlanId;
        this.toothNumber = toothNumber;
        this.procedureName = procedureName;
        this.estimatedCost = estimatedCost != null ? estimatedCost : BigDecimal.ZERO;
        this.sequenceNumber = sequenceNumber != null ? sequenceNumber : 1;
        this.status = ProcedureStatus.PLANNED;
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
            this.status = ProcedureStatus.PLANNED;
        }
        if (this.sequenceNumber == null) {
            this.sequenceNumber = 1;
        }
        if (this.estimatedCost == null) {
            this.estimatedCost = BigDecimal.ZERO;
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

    public Long getTreatmentPlanId() {
        return treatmentPlanId;
    }

    public void setTreatmentPlanId(Long treatmentPlanId) {
        this.treatmentPlanId = treatmentPlanId;
    }

    public Integer getToothNumber() {
        return toothNumber;
    }

    public void setToothNumber(Integer toothNumber) {
        this.toothNumber = toothNumber;
    }

    public String getProcedureName() {
        return procedureName;
    }

    public void setProcedureName(String procedureName) {
        this.procedureName = procedureName;
    }

    public String getProcedureCode() {
        return procedureCode;
    }

    public void setProcedureCode(String procedureCode) {
        this.procedureCode = procedureCode;
    }

    public Integer getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(Integer sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public ProcedureStatus getStatus() {
        return status;
    }

    public void setStatus(ProcedureStatus status) {
        this.status = status;
    }

    public BigDecimal getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(BigDecimal estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public BigDecimal getActualCost() {
        return actualCost;
    }

    public void setActualCost(BigDecimal actualCost) {
        this.actualCost = actualCost;
    }

    public LocalDate getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(LocalDate completionDate) {
        this.completionDate = completionDate;
    }

    public Long getPerformedByDentistId() {
        return performedByDentistId;
    }

    public void setPerformedByDentistId(Long performedByDentistId) {
        this.performedByDentistId = performedByDentistId;
    }

    public Long getAssistedByUserId() {
        return assistedByUserId;
    }

    public void setAssistedByUserId(Long assistedByUserId) {
        this.assistedByUserId = assistedByUserId;
    }

    public String getClinicalProgressNotes() {
        return clinicalProgressNotes;
    }

    public void setClinicalProgressNotes(String clinicalProgressNotes) {
        this.clinicalProgressNotes = clinicalProgressNotes;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
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
