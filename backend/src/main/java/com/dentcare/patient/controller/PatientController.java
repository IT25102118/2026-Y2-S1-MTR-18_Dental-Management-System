package com.dentcare.patient.controller;

import com.dentcare.patient.dto.CreatePatientRequest;
import com.dentcare.patient.dto.DeactivatePatientRequest;
import com.dentcare.patient.dto.PatientResponse;
import com.dentcare.patient.dto.PatientSummaryResponse;
import com.dentcare.patient.dto.UpdatePatientRequest;
import com.dentcare.patient.dto.UpdatePatientStatusRequest;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/** Patient records API. Authentication and CSRF use the existing application defaults. */
@RestController
@RequestMapping("/api/patients")
public class PatientController {
    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public ResponseEntity<PatientResponse> createPatient(@Valid @RequestBody CreatePatientRequest request) {
        PatientResponse created = patientService.createPatient(request);
        return ResponseEntity.created(URI.create("/api/patients/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getPatientById(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    @GetMapping
    public ResponseEntity<Page<PatientSummaryResponse>> searchPatients(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Gender gender,
            @PageableDefault(size = 20, sort = {"lastName", "firstName", "id"}, direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(patientService.searchPatients(search, active, gender, pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> updatePatient(
            @PathVariable Long id, @Valid @RequestBody UpdatePatientRequest request) {
        return ResponseEntity.ok(patientService.updatePatient(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<PatientResponse> deactivatePatient(
            @PathVariable Long id, @Valid @RequestBody(required = false) DeactivatePatientRequest request) {
        String reason = request == null ? null : request.getDeactivationReason();
        return ResponseEntity.ok(patientService.updatePatientStatus(id, new UpdatePatientStatusRequest(false, reason)));
    }

    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<PatientResponse> reactivatePatient(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.updatePatientStatus(id, new UpdatePatientStatusRequest(true)));
    }
}
