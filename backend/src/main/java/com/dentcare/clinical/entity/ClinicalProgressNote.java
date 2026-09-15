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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing a clinical progress note in DentCare.
 * Maps directly to table 'clinical_progress_notes'.
 */
@Entity
@Table(name = "clinical_progress_notes")
public class ClinicalProgressNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Treatment plan ID is required")
    @Column(name = "treatment_plan_id", nullable = false)
    private Long treatmentPlanId;

    @Column(name = "treatment_procedure_id")
    private Long treatmentProcedureId;

    @NotNull(message = "Author user ID is required")
    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @NotNull(message = "Note timestamp is required")
    @Column(name = "note_timestamp", nullable = false)
    private LocalDateTime noteTimestamp;

    @NotBlank(message = "Note content is required")
    @Column(name = "note_content", nullable = false, columnDefinition = "TEXT")
    private String noteContent;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    public ClinicalProgressNote() {
    }

    public ClinicalProgressNote(Long treatmentPlanId, Long treatmentProcedureId,
                                Long authorUserId, String noteContent, LocalDate followUpDate) {
        this.treatmentPlanId = treatmentPlanId;
        this.treatmentProcedureId = treatmentProcedureId;
        this.authorUserId = authorUserId;
        this.noteContent = noteContent;
        this.followUpDate = followUpDate;
    }

    @PrePersist
    protected void onCreate() {
        if (this.noteTimestamp == null) {
            this.noteTimestamp = LocalDateTime.now();
        }
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

    public Long getTreatmentProcedureId() {
        return treatmentProcedureId;
    }

    public void setTreatmentProcedureId(Long treatmentProcedureId) {
        this.treatmentProcedureId = treatmentProcedureId;
    }

    public Long getAuthorUserId() {
        return authorUserId;
    }

    public void setAuthorUserId(Long authorUserId) {
        this.authorUserId = authorUserId;
    }

    public LocalDateTime getNoteTimestamp() {
        return noteTimestamp;
    }

    public void setNoteTimestamp(LocalDateTime noteTimestamp) {
        this.noteTimestamp = noteTimestamp;
    }

    public String getNoteContent() {
        return noteContent;
    }

    public void setNoteContent(String noteContent) {
        this.noteContent = noteContent;
    }

    public LocalDate getFollowUpDate() {
        return followUpDate;
    }

    public void setFollowUpDate(LocalDate followUpDate) {
        this.followUpDate = followUpDate;
    }
}
