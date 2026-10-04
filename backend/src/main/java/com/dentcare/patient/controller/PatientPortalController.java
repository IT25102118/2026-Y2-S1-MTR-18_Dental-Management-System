package com.dentcare.patient.controller;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.patient.dto.ChangePasswordRequest;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientInvoiceDetailResponse;
import com.dentcare.patient.dto.PatientInvoiceSummaryResponse;
import com.dentcare.patient.dto.PasswordChangeResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.dto.PatientProfileResponse;
import com.dentcare.patient.dto.PatientReceiptResponse;
import com.dentcare.patient.dto.UpdatePatientProfileRequest;
import com.dentcare.patient.service.PatientPortalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Controller exposing patient-facing endpoints scoped strictly to the authenticated patient principal.
 * All operations resolve identity exclusively through the authenticated session.
 */
@RestController
@RequestMapping("/api/patient/me")
public class PatientPortalController {

    private final PatientPortalService patientPortalService;

    public PatientPortalController(PatientPortalService patientPortalService) {
        this.patientPortalService = patientPortalService;
    }

    /**
     * Retrieves the authenticated patient's dashboard summary including verified profile info,
     * clinical file status, real prescription counts, and available portal features.
     *
     * @param authentication the authenticated security context principal
     * @return 200 OK with safe dashboard summary
     */
    @GetMapping("/dashboard")
    public ResponseEntity<PatientDashboardSummaryResponse> getDashboardSummary(Authentication authentication) {
        String email = extractEmail(authentication);
        PatientDashboardSummaryResponse summary = patientPortalService.getDashboardSummary(email);
        return ResponseEntity.ok(summary);
    }

    /**
     * Retrieves prescriptions issued to the authenticated patient.
     *
     * @param authentication the authenticated security context principal
     * @return 200 OK with patient's own prescriptions
     */
    @GetMapping("/prescriptions")
    public ResponseEntity<List<PatientPrescriptionItemResponse>> getPrescriptions(Authentication authentication) {
        String email = extractEmail(authentication);
        List<PatientPrescriptionItemResponse> prescriptions = patientPortalService.getPatientPrescriptions(email);
        return ResponseEntity.ok(prescriptions);
    }

    /**
     * Retrieves a single prescription owned by the authenticated patient.
     * Rejects attempts to access another patient's prescription with 403 Forbidden or 404 Not Found.
     *
     * @param id prescription identifier
     * @param authentication the authenticated security context principal
     * @return 200 OK with verified prescription details
     */
    @GetMapping("/prescriptions/{id}")
    public ResponseEntity<PatientPrescriptionItemResponse> getPrescriptionById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientPrescriptionItemResponse prescription = patientPortalService.getPatientPrescriptionById(email, id);
        return ResponseEntity.ok(prescription);
    }

    /**
     * Submits a new appointment request for the authenticated patient.
     * Ownership is derived strictly from the authenticated security principal.
     *
     * @param request valid appointment request payload
     * @param authentication the authenticated security context principal
     * @return 201 Created with initial PENDING appointment details
     */
    @PostMapping("/appointments")
    public ResponseEntity<PatientAppointmentResponse> createAppointment(
            @Valid @RequestBody CreateAppointmentRequest request,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves all appointment requests submitted by the authenticated patient.
     *
     * @param authentication the authenticated security context principal
     * @return 200 OK with patient's own appointments
     */
    @GetMapping("/appointments")
    public ResponseEntity<List<PatientAppointmentResponse>> getAppointments(Authentication authentication) {
        String email = extractEmail(authentication);
        List<PatientAppointmentResponse> appointments = patientPortalService.getPatientAppointments(email);
        return ResponseEntity.ok(appointments);
    }

    /**
     * Retrieves a single appointment request owned by the authenticated patient.
     * Rejects attempts to access another patient's appointment with 403 Forbidden or 404 Not Found.
     *
     * @param id appointment identifier
     * @param authentication the authenticated security context principal
     * @return 200 OK with verified appointment details
     */
    @GetMapping("/appointments/{id}")
    public ResponseEntity<PatientAppointmentResponse> getAppointmentById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientAppointmentResponse appointment = patientPortalService.getPatientAppointmentById(email, id);
        return ResponseEntity.ok(appointment);
    }

    /**
     * Cancels a pending appointment request owned by the authenticated patient.
     * Transitions status from PENDING to CANCELLED.
     *
     * @param id appointment identifier
     * @param authentication the authenticated security context principal
     * @return 200 OK with updated appointment details
     */
    @PatchMapping("/appointments/{id}/cancel")
    public ResponseEntity<PatientAppointmentResponse> cancelAppointment(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientAppointmentResponse response = patientPortalService.cancelAppointmentRequest(email, id);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves all invoices issued to the authenticated patient.
     *
     * @param authentication the authenticated security context principal
     * @return 200 OK with patient's invoices
     */
    @GetMapping("/invoices")
    public ResponseEntity<List<PatientInvoiceSummaryResponse>> getInvoices(Authentication authentication) {
        String email = extractEmail(authentication);
        List<PatientInvoiceSummaryResponse> invoices = patientPortalService.getPatientInvoices(email);
        return ResponseEntity.ok(invoices);
    }

    /**
     * Retrieves a single invoice owned by the authenticated patient.
     * Rejects attempts to access another patient's invoice with 403 Forbidden or 404 Not Found.
     *
     * @param id invoice identifier
     * @param authentication the authenticated security context principal
     * @return 200 OK with verified invoice details
     */
    @GetMapping("/invoices/{id}")
    public ResponseEntity<PatientInvoiceDetailResponse> getInvoiceById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientInvoiceDetailResponse invoice = patientPortalService.getPatientInvoiceById(email, id);
        return ResponseEntity.ok(invoice);
    }

    /**
     * Retrieves a payment receipt owned by the authenticated patient.
     * Rejects attempts to access another patient's receipt with 403 Forbidden or 404 Not Found.
     *
     * @param paymentId payment identifier
     * @param authentication the authenticated security context principal
     * @return 200 OK with verified receipt details
     */
    @GetMapping("/payments/{paymentId}/receipt")
    public ResponseEntity<PatientReceiptResponse> getPaymentReceipt(
            @PathVariable Long paymentId,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientReceiptResponse receipt = patientPortalService.getPatientReceipt(email, paymentId);
        return ResponseEntity.ok(receipt);
    }

    /**
     * Updates the authenticated patient's profile (phone number).
     *
     * @param request profile update request containing phone
     * @param authentication the authenticated security context principal
     * @return 200 OK with safe updated profile details
     */
    @PatchMapping("/profile")
    public ResponseEntity<PatientProfileResponse> updateProfile(
            @Valid @RequestBody UpdatePatientProfileRequest request,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        PatientProfileResponse response = patientPortalService.updatePatientProfile(email, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Changes the authenticated patient's password requiring current password verification.
     *
     * @param request password change request containing current and new passwords
     * @param authentication the authenticated security context principal
     * @return 200 OK with success message
     */
    @PostMapping("/change-password")
    public ResponseEntity<PasswordChangeResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication
    ) {
        String email = extractEmail(authentication);
        patientPortalService.changePatientPassword(email, request);
        return ResponseEntity.ok(PasswordChangeResponse.success());
    }

    private String extractEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authentication.getName();
    }
}
