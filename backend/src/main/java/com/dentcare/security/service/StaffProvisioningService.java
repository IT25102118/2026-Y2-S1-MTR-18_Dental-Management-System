package com.dentcare.security.service;

import com.dentcare.security.dto.StaffProvisioningRequest;
import com.dentcare.security.dto.StaffProvisioningResponse;

/**
 * Service interface for administrator-provisioned staff accounts.
 */
public interface StaffProvisioningService {

    /**
     * Provisions a new staff account with strict role whitelisting, normalized email,
     * securely hashed password, and duplicate-email protection.
     *
     * @param request the validated staff provisioning request
     * @return public response DTO representing the provisioned staff member
     */
    StaffProvisioningResponse provisionStaff(StaffProvisioningRequest request);
}
