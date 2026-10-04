package com.dentcare.patient.service;

import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;

import java.util.List;

/**
 * Service defining authenticated patient portal operations.
 * Enforces strict patient-data isolation by always resolving the target patient
 * directly from the authenticated principal's credentials.
 */
public interface PatientPortalService {

    /**
     * Retrieves the authoritative dashboard summary for the currently authenticated patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @return patient-scoped dashboard summary
     */
    PatientDashboardSummaryResponse getDashboardSummary(String authenticatedEmail);

    /**
     * Retrieves all prescriptions issued to the authenticated patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @return list of patient-owned prescriptions
     */
    List<PatientPrescriptionItemResponse> getPatientPrescriptions(String authenticatedEmail);

    /**
     * Retrieves a single prescription owned by the authenticated patient.
     * Enforces ownership validation; throws ResourceNotFoundException or AccessDeniedException
     * if the prescription does not belong to the authenticated patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param prescriptionId ID of the prescription to view
     * @return patient-owned prescription details
     */
    PatientPrescriptionItemResponse getPatientPrescriptionById(String authenticatedEmail, Long prescriptionId);

    /**
     * Submits an appointment request for the authenticated patient.
     * Derives patient ownership solely from the authenticated principal.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param request appointment request payload
     * @return created appointment response with PENDING status
     */
    com.dentcare.appointment.dto.PatientAppointmentResponse createAppointmentRequest(
            String authenticatedEmail,
            com.dentcare.appointment.dto.CreateAppointmentRequest request
    );

    /**
     * Retrieves all appointment requests submitted by the authenticated patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @return list of patient-owned appointments
     */
    List<com.dentcare.appointment.dto.PatientAppointmentResponse> getPatientAppointments(String authenticatedEmail);

    /**
     * Retrieves a single appointment request owned by the authenticated patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param appointmentId ID of the appointment request
     * @return patient-owned appointment response
     */
    com.dentcare.appointment.dto.PatientAppointmentResponse getPatientAppointmentById(
            String authenticatedEmail,
            Long appointmentId
    );
}
