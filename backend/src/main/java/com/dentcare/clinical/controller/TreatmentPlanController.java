package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.ApproveTreatmentPlanRequest;
import com.dentcare.clinical.dto.CancelTreatmentPlanRequest;
import com.dentcare.clinical.dto.CreateTreatmentPlanRequest;
import com.dentcare.clinical.dto.FollowUpRequest;
import com.dentcare.clinical.dto.TreatmentPlanResponse;
import com.dentcare.clinical.dto.UpdateTreatmentPlanRequest;
import com.dentcare.clinical.service.TreatmentPlanService;
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
 * REST controller for managing dental treatment plans, stage transitions, dentist approvals,
 * and follow-up scheduling.
 */
@RestController
@RequestMapping("/api/clinical/treatment-plans")
public class TreatmentPlanController {

    private final TreatmentPlanService treatmentPlanService;

    public TreatmentPlanController(TreatmentPlanService treatmentPlanService) {
        this.treatmentPlanService = treatmentPlanService;
    }

    @PostMapping
    public ResponseEntity<TreatmentPlanResponse> createTreatmentPlan(
            @Valid @RequestBody CreateTreatmentPlanRequest request) {
        TreatmentPlanResponse created = treatmentPlanService.createTreatmentPlan(request);
        URI location = URI.create("/api/clinical/treatment-plans/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TreatmentPlanResponse> getTreatmentPlanById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(treatmentPlanService.getTreatmentPlanById(id));
    }

    @GetMapping
    public ResponseEntity<List<TreatmentPlanResponse>> getTreatmentPlans(
            @RequestParam(name = "patientId", required = false) Long patientId,
            @RequestParam(name = "examinationId", required = false) Long examinationId,
            @RequestParam(name = "dentistId", required = false) Long dentistId) {
        if (patientId != null) {
            return ResponseEntity.ok(treatmentPlanService.getTreatmentPlansByPatientId(patientId));
        } else if (examinationId != null) {
            return ResponseEntity.ok(treatmentPlanService.getTreatmentPlansByExaminationId(examinationId));
        } else if (dentistId != null) {
            return ResponseEntity.ok(treatmentPlanService.getTreatmentPlansByDentistId(dentistId));
        }
        return ResponseEntity.badRequest().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<TreatmentPlanResponse> updateTreatmentPlan(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateTreatmentPlanRequest request) {
        return ResponseEntity.ok(treatmentPlanService.updateTreatmentPlan(id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<TreatmentPlanResponse> approveTreatmentPlan(
            @PathVariable("id") Long id,
            @Valid @RequestBody ApproveTreatmentPlanRequest request) {
        return ResponseEntity.ok(treatmentPlanService.approveTreatmentPlan(id, request));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<TreatmentPlanResponse> startTreatmentPlan(
            @PathVariable("id") Long id,
            @RequestParam(name = "dentistId", required = false) Long dentistId) {
        if (dentistId != null) {
            return ResponseEntity.ok(treatmentPlanService.startTreatmentPlan(id, dentistId));
        }
        return ResponseEntity.ok(treatmentPlanService.startTreatmentPlan(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<TreatmentPlanResponse> completeTreatmentPlan(
            @PathVariable("id") Long id,
            @RequestParam(name = "dentistId", required = false) Long dentistId) {
        if (dentistId != null) {
            return ResponseEntity.ok(treatmentPlanService.completeTreatmentPlan(id, dentistId));
        }
        return ResponseEntity.ok(treatmentPlanService.completeTreatmentPlan(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<TreatmentPlanResponse> cancelTreatmentPlan(
            @PathVariable("id") Long id,
            @Valid @RequestBody CancelTreatmentPlanRequest request) {
        return ResponseEntity.ok(treatmentPlanService.cancelTreatmentPlan(id, request));
    }

    @PostMapping("/{id}/follow-up")
    public ResponseEntity<TreatmentPlanResponse> setFollowUpDate(
            @PathVariable("id") Long id,
            @Valid @RequestBody FollowUpRequest request) {
        return ResponseEntity.ok(treatmentPlanService.setFollowUpDate(id, request));
    }
}
