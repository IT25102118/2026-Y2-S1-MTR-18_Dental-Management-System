package com.dentcare.clinical.dto;

import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ExaminationStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO exposing clinical examination details.
 */
public record ClinicalExaminationResponse(
        Long id,
        Long patientId,
        Long dentistId,
        Long recordedByUserId,
        Long appointmentId,
        LocalDate examinationDate,
        String chiefComplaint,
        String clinicalObservations,
        String provisionalDiagnosis,
        String confirmedDiagnosis,
        boolean isDiagnosisConfirmed,
        Long confirmedByDentistId,
        LocalDateTime diagnosisConfirmedAt,
        LocalDate followUpDate,
        String followUpNotes,
        ExaminationStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Long version
) {
    public static ClinicalExaminationResponse fromEntity(ClinicalExamination entity) {
        if (entity == null) {
            return null;
        }
        return new ClinicalExaminationResponse(
                entity.getId(),
                entity.getPatientId(),
                entity.getDentistId(),
                entity.getRecordedByUserId(),
                entity.getAppointmentId(),
                entity.getExaminationDate(),
                entity.getChiefComplaint(),
                entity.getClinicalObservations(),
                entity.getProvisionalDiagnosis(),
                entity.getConfirmedDiagnosis(),
                entity.isDiagnosisConfirmed(),
                entity.getConfirmedByDentistId(),
                entity.getDiagnosisConfirmedAt(),
                entity.getFollowUpDate(),
                entity.getFollowUpNotes(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getVersion()
        );
    }
}
