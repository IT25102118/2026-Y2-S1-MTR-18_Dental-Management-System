package com.dentcare.prescription.controller;

import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.ExaminationPrescriptionContextResponse;
import com.dentcare.prescription.dto.PatientSafetyResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
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
 */
@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(
            PrescriptionService prescriptionService
    ) {
        this.prescriptionService = prescriptionService;
    }

    /**
     * Creates a new DRAFT prescription.
     */
    @PostMapping
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @Valid @RequestBody CreatePrescriptionRequest request
    ) {

        PrescriptionResponse created =
                prescriptionService.createPrescription(request);

        URI location =
                URI.create("/api/prescriptions/" + created.id());

        return ResponseEntity
                .created(location)
                .body(created);
    }

    /**
     * Lists all prescriptions.
     */
    @GetMapping
    public ResponseEntity<Page<PrescriptionSummaryResponse>>
    getAllPrescriptions(
            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    ) {

        return ResponseEntity.ok(
                prescriptionService.getAllPrescriptions(pageable)
        );
    }

    /**
     * Returns recorded patient allergy information.
     */
    @GetMapping("/patient-safety/{patientUserId}")
    public ResponseEntity<PatientSafetyResponse>
    getPatientSafety(
            @PathVariable Long patientUserId
    ) {

        return ResponseEntity.ok(
                prescriptionService.getPatientSafety(
                        patientUserId
                )
        );
    }

    /**
     * Reads Clinical Examination information for
     * Prescription Management.
     *
     * This endpoint is read-only.
     */
    @GetMapping("/examination-context/{examinationId}")
    public ResponseEntity<ExaminationPrescriptionContextResponse>
    getExaminationPrescriptionContext(
            @PathVariable Long examinationId
    ) {

        return ResponseEntity.ok(
                prescriptionService
                        .getExaminationPrescriptionContext(
                                examinationId
                        )
        );
    }

    /**
     * Lists prescriptions for a specific patient.
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<Page<PrescriptionSummaryResponse>>
    getPrescriptionsByPatient(
            @PathVariable Long patientId,
            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    ) {

        return ResponseEntity.ok(
                prescriptionService
                        .getPrescriptionsByPatient(
                                patientId,
                                pageable
                        )
        );
    }

    /**
     * Retrieves one prescription.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponse>
    getPrescriptionById(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                prescriptionService
                        .getPrescriptionById(id)
        );
    }

    /**
     * Updates a DRAFT prescription.
     */
    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionResponse>
    updatePrescription(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePrescriptionRequest request
    ) {

        return ResponseEntity.ok(
                prescriptionService
                        .updatePrescription(
                                id,
                                request
                        )
        );
    }

    /**
     * Permanently deletes a DRAFT prescription.
     *
     * FINALIZED and CANCELLED prescriptions cannot be deleted.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDraftPrescription(
            @PathVariable Long id
    ) {

        prescriptionService.deleteDraftPrescription(id);

        return ResponseEntity.noContent().build();
    }

    /**
     * Finalizes a DRAFT prescription.
     */
    @PostMapping("/{id}/finalize")
    public ResponseEntity<PrescriptionResponse>
    finalizePrescription(
            @PathVariable Long id,
            @RequestParam Long dentistId
    ) {

        return ResponseEntity.ok(
                prescriptionService
                        .finalizePrescription(
                                id,
                                dentistId
                        )
        );
    }

    /**
     * Cancels a DRAFT or FINALIZED prescription.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<PrescriptionResponse>
    cancelPrescription(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                prescriptionService
                        .cancelPrescription(id)
        );
    }
}