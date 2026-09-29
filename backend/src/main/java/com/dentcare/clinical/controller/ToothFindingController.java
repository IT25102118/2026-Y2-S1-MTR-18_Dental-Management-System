package com.dentcare.clinical.controller;

import com.dentcare.clinical.dto.AddToothFindingRequest;
import com.dentcare.clinical.dto.ToothFindingResponse;
import com.dentcare.clinical.dto.UpdateToothFindingRequest;
import com.dentcare.clinical.service.ToothFindingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

/**
 * REST controller for recording and querying tooth and general oral cavity findings.
 */
@RestController
@RequestMapping("/api/clinical")
public class ToothFindingController {

    private final ToothFindingService toothFindingService;

    public ToothFindingController(ToothFindingService toothFindingService) {
        this.toothFindingService = toothFindingService;
    }

    @PostMapping("/examinations/{examinationId}/tooth-findings")
    public ResponseEntity<ToothFindingResponse> addToothFinding(
            @PathVariable("examinationId") Long examinationId,
            @Valid @RequestBody AddToothFindingRequest request) {
        ToothFindingResponse created = toothFindingService.addToothFinding(examinationId, request);
        URI location = URI.create("/api/clinical/tooth-findings/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/examinations/{examinationId}/tooth-findings")
    public ResponseEntity<List<ToothFindingResponse>> getToothFindingsByExaminationId(
            @PathVariable("examinationId") Long examinationId) {
        return ResponseEntity.ok(toothFindingService.getToothFindingsByExaminationId(examinationId));
    }

    @GetMapping("/tooth-findings/{id}")
    public ResponseEntity<ToothFindingResponse> getToothFindingById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(toothFindingService.getToothFindingById(id));
    }

    @PutMapping("/tooth-findings/{id}")
    public ResponseEntity<ToothFindingResponse> updateToothFinding(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateToothFindingRequest request) {
        return ResponseEntity.ok(toothFindingService.updateToothFinding(id, request));
    }
}
