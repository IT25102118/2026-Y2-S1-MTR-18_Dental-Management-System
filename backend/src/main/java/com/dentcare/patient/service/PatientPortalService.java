package com.dentcare.patient.service;

import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientInvoiceDetailResponse;
import com.dentcare.patient.dto.PatientInvoiceSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.dto.PatientReceiptResponse;

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

    /**
     * Cancels a pending appointment request owned by the authenticated patient.
     * Enforces that only PENDING appointment requests can be cancelled, and validates ownership.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param appointmentId ID of the appointment request to cancel
     * @return updated appointment response with CANCELLED status
     */
    com.dentcare.appointment.dto.PatientAppointmentResponse cancelAppointmentRequest(
            String authenticatedEmail,
            Long appointmentId
    );

    /**
     * Retrieves all invoices issued to the authenticated patient, ordered by invoice date descending.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @return list of patient-safe invoice summaries
     */
    List<PatientInvoiceSummaryResponse> getPatientInvoices(String authenticatedEmail);

    /**
     * Retrieves a single invoice owned by the authenticated patient, including itemized charges and payments.
     * Enforces ownership validation; throws 404 if missing or 403 if belonging to another patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param invoiceId ID of the invoice
     * @return patient-safe invoice details
     */
    PatientInvoiceDetailResponse getPatientInvoiceById(String authenticatedEmail, Long invoiceId);

    /**
     * Retrieves receipt details for a payment belonging to an invoice owned by the authenticated patient.
     * Enforces ownership validation; throws 404 if missing or 403 if belonging to another patient.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param paymentId ID of the payment
     * @return patient-safe receipt details
     */
    PatientReceiptResponse getPatientReceipt(String authenticatedEmail, Long paymentId);

    /**
     * Updates the authenticated patient's profile details (phone number).
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param request profile update payload containing only permitted fields
     * @return updated safe patient profile response
     */
    com.dentcare.patient.dto.PatientProfileResponse updatePatientProfile(
            String authenticatedEmail,
            com.dentcare.patient.dto.UpdatePatientProfileRequest request
    );

    /**
     * Changes the authenticated patient's password after verifying the current password.
     *
     * @param authenticatedEmail email of the authenticated principal
     * @param request password change payload containing current and new passwords
     */
    void changePatientPassword(
            String authenticatedEmail,
            com.dentcare.patient.dto.ChangePasswordRequest request
    );
}
