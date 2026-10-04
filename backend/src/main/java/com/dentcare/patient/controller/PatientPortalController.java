package com.dentcare.patient.controller;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.service.PatientPortalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
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

    private String extractEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authentication.getName();
    }
}
