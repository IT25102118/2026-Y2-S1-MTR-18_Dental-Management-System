package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.ClinicalExaminationResponse;
import com.dentcare.clinical.dto.ConfirmDiagnosisRequest;
import com.dentcare.clinical.dto.CreateClinicalExaminationRequest;
import com.dentcare.clinical.dto.UpdateClinicalExaminationRequest;
import com.dentcare.clinical.service.ClinicalExaminationService;
import jakarta.validation.Valid;
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
import java.util.List;

/**
 * REST controller for managing clinical examination records, patient examination history,
 * and dentist diagnosis confirmations.
 */
@RestController
@RequestMapping("/api/clinical/examinations")
public class ClinicalExaminationController {

    private final ClinicalExaminationService clinicalExaminationService;

    public ClinicalExaminationController(ClinicalExaminationService clinicalExaminationService) {
        this.clinicalExaminationService = clinicalExaminationService;
    }

    @PostMapping
    public ResponseEntity<ClinicalExaminationResponse> createExamination(
            @Valid @RequestBody CreateClinicalExaminationRequest request) {
        ClinicalExaminationResponse created = clinicalExaminationService.createDraftExamination(request);
        URI location = URI.create("/api/clinical/examinations/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClinicalExaminationResponse> getExaminationById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(clinicalExaminationService.getExaminationById(id));
    }

    @GetMapping
    public ResponseEntity<List<ClinicalExaminationResponse>> getExaminationsByPatientId(
            @RequestParam("patientId") Long patientId) {
        return ResponseEntity.ok(clinicalExaminationService.getExaminationsByPatientId(patientId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClinicalExaminationResponse> updateDraftExamination(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateClinicalExaminationRequest request) {
        return ResponseEntity.ok(clinicalExaminationService.updateDraftExamination(id, request));
    }

    @PostMapping("/{id}/confirm-diagnosis")
    public ResponseEntity<ClinicalExaminationResponse> confirmDiagnosis(
            @PathVariable("id") Long id,
            @Valid @RequestBody ConfirmDiagnosisRequest request) {
        return ResponseEntity.ok(clinicalExaminationService.confirmDiagnosis(id, request));
    }
}
