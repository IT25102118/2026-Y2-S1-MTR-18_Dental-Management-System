package com.dentcare.security.dto;

import com.dentcare.security.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Data transfer object for administrator-provisioned staff accounts.
 */
public record StaffProvisioningRequest(
        @NotBlank(message = "First name is required")
        @Size(max = 60, message = "First name cannot exceed 60 characters")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 60, message = "Last name cannot exceed 60 characters")
        String lastName,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        @Size(max = 150, message = "Email cannot exceed 150 characters")
        String email,

        @Size(max = 25, message = "Phone number cannot exceed 25 characters")
        String phone,

        @NotNull(message = "Role is required")
        Role role,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Password must contain at least one letter and one digit")
        String password
) {
}
