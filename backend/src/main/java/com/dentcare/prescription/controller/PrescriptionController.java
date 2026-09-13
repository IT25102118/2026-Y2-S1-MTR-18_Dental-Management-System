package com.dentcare.prescription.controller;

import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.PrescriptionResponse;
import com.dentcare.prescription.dto.PrescriptionSummaryResponse;
import com.dentcare.prescription.dto.UpdatePrescriptionRequest;
import com.dentcare.prescription.service.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * REST controller for MF-04 Prescription Management.
 * Endpoints manage the full prescription lifecycle: create, read, list, update, finalize, and cancel.
 */
@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    /**
     * Creates a new DRAFT prescription.
     * POST /api/prescriptions
     */
    @PostMapping
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {
        PrescriptionResponse created = prescriptionService.createPrescription(request);
        URI location = URI.create("/api/prescriptions/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    /**
     * Retrieves a prescription by ID with full item details.
     * GET /api/prescriptions/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> getPrescriptionById(@PathVariable Long id) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionById(id));
    }

    /**
     * Lists all prescriptions, paginated.
     * GET /api/prescriptions
     */
    @GetMapping
    public ResponseEntity<Page<PrescriptionSummaryResponse>> getAllPrescriptions(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(prescriptionService.getAllPrescriptions(pageable));
    }

    /**
     * Lists prescriptions for a specific patient, paginated.
     * GET /api/prescriptions/patient/{patientId}
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<Page<PrescriptionSummaryResponse>> getPrescriptionsByPatient(
            @PathVariable Long patientId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatient(patientId, pageable));
    }

    /**
     * Updates the notes and/or items of a DRAFT prescription.
     * PUT /api/prescriptions/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> updatePrescription(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePrescriptionRequest request
    ) {
        return ResponseEntity.ok(prescriptionService.updatePrescription(id, request));
    }

    /**
     * Finalizes a DRAFT prescription. Requires dentistId as a request param to validate DENTIST role.
     * POST /api/prescriptions/{id}/finalize?dentistId=X
     */
    @PostMapping("/{id}/finalize")
    public ResponseEntity<PrescriptionResponse> finalizePrescription(
            @PathVariable Long id,
            @RequestParam Long dentistId
    ) {
        return ResponseEntity.ok(prescriptionService.finalizePrescription(id, dentistId));
    }

    /**
     * Cancels a prescription (DRAFT or FINALIZED). Records are preserved; no deletion occurs.
     * POST /api/prescriptions/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<PrescriptionResponse> cancelPrescription(@PathVariable Long id) {
        return ResponseEntity.ok(prescriptionService.cancelPrescription(id));
    }
}
