package com.dentcare.security.service;

import com.dentcare.security.dto.StaffProvisioningRequest;
import com.dentcare.security.dto.StaffProvisioningResponse;
import com.dentcare.security.dto.UpdateStaffRequest;
import com.dentcare.security.dto.UpdateStaffStatusRequest;

import java.util.List;

/**
 * Service interface for administrator-provisioned staff accounts and lifecycle management.
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

    /**
     * Lists all staff accounts in the system.
     *
     * @return list of public response DTOs for all staff accounts
     */
    List<StaffProvisioningResponse> getAllStaff();

    /**
     * Retrieves a single staff member by ID.
     *
     * @param id the user ID
     * @return public response DTO for the staff member
     */
    StaffProvisioningResponse getStaffById(Long id);

    /**
     * Updates an existing staff member's details (first name, last name, phone, role).
     * Email remains immutable for identity integrity.
     *
     * @param id the user ID
     * @param request the update fields
     * @return public response DTO representing the updated staff member
     */
    StaffProvisioningResponse updateStaff(Long id, UpdateStaffRequest request);

    /**
     * Updates an existing staff member's active status (soft deactivation/activation).
     *
     * @param id the user ID
     * @param request the status update
     * @return public response DTO representing the updated staff member
     */
    StaffProvisioningResponse updateStaffStatus(Long id, UpdateStaffStatusRequest request);
}
