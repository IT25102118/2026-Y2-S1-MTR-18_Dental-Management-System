package com.dentcare.clinical.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * JPA entity representing an individual tooth or general oral finding in DentCare.
 * Maps directly to table 'tooth_findings'.
 */
@Entity
@Table(name = "tooth_findings")
public class ToothFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Examination ID is required")
    @Column(name = "examination_id", nullable = false)
    private Long examinationId;

    @Column(name = "tooth_number")
    private Integer toothNumber;

    @Column(name = "is_general", nullable = false)
    private boolean isGeneral = false;

    @NotBlank(message = "Condition name is required")
    @Size(max = 150, message = "Condition name cannot exceed 150 characters")
    @Column(name = "condition_name", nullable = false, length = 150)
    private String conditionName;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    @Column(name = "notes", length = 500)
    private String notes;

    @NotNull(message = "Recorded-by user ID is required")
    @Column(name = "recorded_by_user_id", nullable = false)
    private Long recordedByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ToothFinding() {
    }

    public ToothFinding(Long examinationId, Integer toothNumber, boolean isGeneral,
                        String conditionName, String notes, Long recordedByUserId) {
        this.examinationId = examinationId;
        this.toothNumber = toothNumber;
        this.isGeneral = isGeneral;
        this.conditionName = conditionName;
        this.notes = notes;
        this.recordedByUserId = recordedByUserId;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getExaminationId() {
        return examinationId;
    }

    public void setExaminationId(Long examinationId) {
        this.examinationId = examinationId;
    }

    public Integer getToothNumber() {
        return toothNumber;
    }

    public void setToothNumber(Integer toothNumber) {
        this.toothNumber = toothNumber;
    }

    public boolean isGeneral() {
        return isGeneral;
    }

    public void setGeneral(boolean general) {
        isGeneral = general;
    }

    public String getConditionName() {
        return conditionName;
    }

    public void setConditionName(String conditionName) {
        this.conditionName = conditionName;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getRecordedByUserId() {
        return recordedByUserId;
    }

    public void setRecordedByUserId(Long recordedByUserId) {
        this.recordedByUserId = recordedByUserId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
