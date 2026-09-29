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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing a clinical examination session in DentCare.
 * Maps directly to table 'clinical_examinations'.
 * Cross-module relationships (Patient, Dentist, User, Appointment) are represented
 * as Long IDs to maintain clear architectural boundaries and isolation.
 */
@Entity
@Table(name = "clinical_examinations")
public class ClinicalExamination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Patient ID is required")
    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @NotNull(message = "Dentist ID is required")
    @Column(name = "dentist_id", nullable = false)
    private Long dentistId;

    @NotNull(message = "Recorded-by user ID is required")
    @Column(name = "recorded_by_user_id", nullable = false)
    private Long recordedByUserId;

    @Column(name = "appointment_id")
    private Long appointmentId;

    @NotNull(message = "Examination date is required")
    @Column(name = "examination_date", nullable = false)
    private LocalDate examinationDate;

    @NotBlank(message = "Chief complaint is required")
    @Column(name = "chief_complaint", nullable = false, columnDefinition = "TEXT")
    private String chiefComplaint;

    @Column(name = "clinical_observations", columnDefinition = "TEXT")
    private String clinicalObservations;

    @Size(max = 500, message = "Provisional diagnosis cannot exceed 500 characters")
    @Column(name = "provisional_diagnosis", length = 500)
    private String provisionalDiagnosis;

    @Size(max = 500, message = "Confirmed diagnosis cannot exceed 500 characters")
    @Column(name = "confirmed_diagnosis", length = 500)
    private String confirmedDiagnosis;

    @Column(name = "is_diagnosis_confirmed", nullable = false)
    private boolean isDiagnosisConfirmed = false;

    @Column(name = "confirmed_by_dentist_id")
    private Long confirmedByDentistId;

    @Column(name = "diagnosis_confirmed_at")
    private LocalDateTime diagnosisConfirmedAt;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Size(max = 500, message = "Follow-up notes cannot exceed 500 characters")
    @Column(name = "follow_up_notes", length = 500)
    private String followUpNotes;

    @NotNull(message = "Examination status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ExaminationStatus status = ExaminationStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    public ClinicalExamination() {
    }

    public ClinicalExamination(Long patientId, Long dentistId, Long recordedByUserId,
                               LocalDate examinationDate, String chiefComplaint) {
        this.patientId = patientId;
        this.dentistId = dentistId;
        this.recordedByUserId = recordedByUserId;
        this.examinationDate = examinationDate;
        this.chiefComplaint = chiefComplaint;
        this.status = ExaminationStatus.DRAFT;
        this.isDiagnosisConfirmed = false;
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
            this.status = ExaminationStatus.DRAFT;
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

    public Long getRecordedByUserId() {
        return recordedByUserId;
    }

    public void setRecordedByUserId(Long recordedByUserId) {
        this.recordedByUserId = recordedByUserId;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(Long appointmentId) {
        this.appointmentId = appointmentId;
    }

    public LocalDate getExaminationDate() {
        return examinationDate;
    }

    public void setExaminationDate(LocalDate examinationDate) {
        this.examinationDate = examinationDate;
    }

    public String getChiefComplaint() {
        return chiefComplaint;
    }

    public void setChiefComplaint(String chiefComplaint) {
        this.chiefComplaint = chiefComplaint;
    }

    public String getClinicalObservations() {
        return clinicalObservations;
    }

    public void setClinicalObservations(String clinicalObservations) {
        this.clinicalObservations = clinicalObservations;
    }

    public String getProvisionalDiagnosis() {
        return provisionalDiagnosis;
    }

    public void setProvisionalDiagnosis(String provisionalDiagnosis) {
        this.provisionalDiagnosis = provisionalDiagnosis;
    }

    public String getConfirmedDiagnosis() {
        return confirmedDiagnosis;
    }

    public void setConfirmedDiagnosis(String confirmedDiagnosis) {
        this.confirmedDiagnosis = confirmedDiagnosis;
    }

    public boolean isDiagnosisConfirmed() {
        return isDiagnosisConfirmed;
    }

    public void setDiagnosisConfirmed(boolean diagnosisConfirmed) {
        isDiagnosisConfirmed = diagnosisConfirmed;
    }

    public Long getConfirmedByDentistId() {
        return confirmedByDentistId;
    }

    public void setConfirmedByDentistId(Long confirmedByDentistId) {
        this.confirmedByDentistId = confirmedByDentistId;
    }

    public LocalDateTime getDiagnosisConfirmedAt() {
        return diagnosisConfirmedAt;
    }

    public void setDiagnosisConfirmedAt(LocalDateTime diagnosisConfirmedAt) {
        this.diagnosisConfirmedAt = diagnosisConfirmedAt;
    }

    public LocalDate getFollowUpDate() {
        return followUpDate;
    }

    public void setFollowUpDate(LocalDate followUpDate) {
        this.followUpDate = followUpDate;
    }

    public String getFollowUpNotes() {
        return followUpNotes;
    }

    public void setFollowUpNotes(String followUpNotes) {
        this.followUpNotes = followUpNotes;
    }

    public ExaminationStatus getStatus() {
        return status;
    }

    public void setStatus(ExaminationStatus status) {
        this.status = status;
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
