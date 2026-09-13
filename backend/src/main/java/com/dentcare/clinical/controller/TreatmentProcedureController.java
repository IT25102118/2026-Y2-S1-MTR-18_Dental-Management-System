package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.AddTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CancelTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CompleteTreatmentProcedureRequest;
import com.dentcare.clinical.dto.TreatmentProcedureResponse;
import com.dentcare.clinical.dto.UpdateTreatmentProcedureRequest;
import com.dentcare.clinical.service.TreatmentProcedureService;
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
 * REST controller for managing treatment procedures, sequencing, procedure status transitions,
 * execution records, and cost tracking.
 */
@RestController
@RequestMapping("/api/clinical")
public class TreatmentProcedureController {

    private final TreatmentProcedureService treatmentProcedureService;

    public TreatmentProcedureController(TreatmentProcedureService treatmentProcedureService) {
        this.treatmentProcedureService = treatmentProcedureService;
    }

    @PostMapping("/treatment-plans/{planId}/procedures")
    public ResponseEntity<TreatmentProcedureResponse> addTreatmentProcedure(
            @PathVariable("planId") Long planId,
            @Valid @RequestBody AddTreatmentProcedureRequest request) {
        TreatmentProcedureResponse created = treatmentProcedureService.addTreatmentProcedure(planId, request);
        URI location = URI.create("/api/clinical/treatment-procedures/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/treatment-plans/{planId}/procedures")
    public ResponseEntity<List<TreatmentProcedureResponse>> getProceduresByPlanId(
            @PathVariable("planId") Long planId,
            @RequestParam(name = "toothNumber", required = false) Integer toothNumber) {
        if (toothNumber != null) {
            return ResponseEntity.ok(treatmentProcedureService.getProceduresByTooth(planId, toothNumber));
        }
        return ResponseEntity.ok(treatmentProcedureService.getProceduresByTreatmentPlanId(planId));
    }

    @GetMapping("/treatment-procedures/{id}")
    public ResponseEntity<TreatmentProcedureResponse> getTreatmentProcedureById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(treatmentProcedureService.getTreatmentProcedureById(id));
    }

    @PutMapping("/treatment-procedures/{id}")
    public ResponseEntity<TreatmentProcedureResponse> updateTreatmentProcedure(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateTreatmentProcedureRequest request) {
        return ResponseEntity.ok(treatmentProcedureService.updateTreatmentProcedure(id, request));
    }

    @PostMapping("/treatment-procedures/{id}/start")
    public ResponseEntity<TreatmentProcedureResponse> startTreatmentProcedure(
            @PathVariable("id") Long id,
            @RequestParam(name = "dentistId", required = false) Long dentistId) {
        if (dentistId != null) {
            return ResponseEntity.ok(treatmentProcedureService.startTreatmentProcedure(id, dentistId));
        }
        return ResponseEntity.ok(treatmentProcedureService.startTreatmentProcedure(id));
    }

    @PostMapping("/treatment-procedures/{id}/complete")
    public ResponseEntity<TreatmentProcedureResponse> completeTreatmentProcedure(
            @PathVariable("id") Long id,
            @Valid @RequestBody CompleteTreatmentProcedureRequest request) {
        return ResponseEntity.ok(treatmentProcedureService.completeTreatmentProcedure(id, request));
    }

    @PostMapping("/treatment-procedures/{id}/cancel")
    public ResponseEntity<TreatmentProcedureResponse> cancelTreatmentProcedure(
            @PathVariable("id") Long id,
            @Valid @RequestBody CancelTreatmentProcedureRequest request) {
        return ResponseEntity.ok(treatmentProcedureService.cancelTreatmentProcedure(id, request));
    }
}
