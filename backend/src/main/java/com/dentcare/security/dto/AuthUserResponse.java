package com.dentcare.security.dto;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.model.DentCareUserDetails;

/**
 * Public response model for authenticated user details.
 * Strictly omits passwords, hashes, session identifiers, and CSRF secrets.
 */
public record AuthUserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        Role role
) {
    public static AuthUserResponse fromUserDetails(DentCareUserDetails userDetails) {
        return new AuthUserResponse(
                userDetails.getId(),
                userDetails.getEmail(),
                userDetails.getFirstName(),
                userDetails.getLastName(),
                userDetails.getPhone(),
                userDetails.getRole()
        );
    }

    public static AuthUserResponse fromEntity(User user) {
        return new AuthUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole()
        );
    }
}
