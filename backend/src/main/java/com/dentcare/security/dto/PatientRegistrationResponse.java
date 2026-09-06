package com.dentcare.security.dto;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;

import java.time.LocalDateTime;

/**
 * Public response DTO returned upon successful patient registration.
 * Never exposes raw passwords, password hashes, or internal security credentials.
 */
public record PatientRegistrationResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        Role role,
        boolean active,
        LocalDateTime createdAt
) {
    public static PatientRegistrationResponse fromEntity(User user) {
        return new PatientRegistrationResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt()
        );
    }
}
