package com.dentcare.security.controller;

import com.dentcare.security.dto.StaffProvisioningRequest;
import com.dentcare.security.dto.StaffProvisioningResponse;
import com.dentcare.security.service.StaffProvisioningService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrative REST controller for staff account provisioning.
 * Protected by Spring Security to ensure only authenticated users holding
 * the ADMINISTRATOR role can access these endpoints.
 */
@RestController
@RequestMapping("/api/admin")
public class StaffProvisioningController {

    private final StaffProvisioningService staffProvisioningService;

    public StaffProvisioningController(StaffProvisioningService staffProvisioningService) {
        this.staffProvisioningService = staffProvisioningService;
    }

    /**
     * Provisions a new staff account (ADMINISTRATOR, RECEPTIONIST, DENTIST, DENTAL_ASSISTANT).
     *
     * @param request the validated staff provisioning payload
     * @return 201 Created with safe public staff account information
     */
    @PostMapping("/staff")
    public ResponseEntity<StaffProvisioningResponse> provisionStaff(
            @Valid @RequestBody StaffProvisioningRequest request) {
        StaffProvisioningResponse response = staffProvisioningService.provisionStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
