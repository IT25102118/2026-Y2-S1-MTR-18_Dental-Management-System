package com.dentcare.patient.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Authoritative response DTO for the authenticated Patient Portal dashboard.
 * Derived solely from the authenticated principal session, ensuring strict patient data isolation.
 */
public record PatientDashboardSummaryResponse(
        PatientProfileSummary patient,
        ClinicalStatus clinicalStatus,
        PrescriptionsSummary prescriptionsSummary,
        List<PortalFeatureResponse> availableFeatures
) {
    public record PatientProfileSummary(
            Long userId,
            String firstName,
            String lastName,
            String email,
            String phone,
            String role,
            boolean active,
            LocalDateTime memberSince,
            String patientCode,
            boolean hasClinicalProfile,
            String gender,
            LocalDate dateOfBirth
    ) {}

    public record ClinicalStatus(
            boolean profileLinked,
            String patientCode,
            String intakeStatus,
            String message
    ) {}

    public record PrescriptionsSummary(
            long totalCount,
            long activeCount,
            List<PatientPrescriptionItemResponse> recentPrescriptions
    ) {}

    public record PortalFeatureResponse(
            String id,
            String name,
            String description,
            String route,
            String status
    ) {}
}
