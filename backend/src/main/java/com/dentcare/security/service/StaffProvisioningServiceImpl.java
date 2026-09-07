package com.dentcare.security.service;

import com.dentcare.security.dto.StaffProvisioningRequest;
import com.dentcare.security.dto.StaffProvisioningResponse;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.exception.DuplicateEmailException;
import com.dentcare.security.exception.InvalidStaffRoleException;
import com.dentcare.security.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Set;

/**
 * Implementation of StaffProvisioningService enforcing business constraints:
 * - Allowed roles are strictly limited to ADMINISTRATOR, RECEPTIONIST, DENTIST, DENTAL_ASSISTANT.
 * - PATIENT is explicitly rejected.
 * - Email is normalized (trimmed and lowercased).
 * - Duplicate email checks prevent collisions with user-friendly error messages.
 * - Passwords are securely hashed with BCrypt; raw passwords are never persisted.
 */
@Service
public class StaffProvisioningServiceImpl implements StaffProvisioningService {

    public static final Set<Role> ALLOWED_STAFF_ROLES = EnumSet.of(
            Role.ADMINISTRATOR,
            Role.RECEPTIONIST,
            Role.DENTIST,
            Role.DENTAL_ASSISTANT
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffProvisioningServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public StaffProvisioningResponse provisionStaff(StaffProvisioningRequest request) {
        // Enforce exact staff role whitelist
        Role requestedRole = request.role();
        if (requestedRole == null || !ALLOWED_STAFF_ROLES.contains(requestedRole)) {
            if (requestedRole == Role.PATIENT) {
                throw new InvalidStaffRoleException("Role PATIENT is not permitted for staff account provisioning");
            }
            throw new InvalidStaffRoleException("Invalid staff role: " + requestedRole);
        }

        String normalizedEmail = request.email() != null ? request.email().trim().toLowerCase() : "";

        // Pre-check for duplicate email
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateEmailException("An account with this email address already exists");
        }

        String firstName = request.firstName() != null ? request.firstName().trim() : "";
        String lastName = request.lastName() != null ? request.lastName().trim() : "";
        String phone = request.phone() != null ? request.phone().trim() : null;
        if (phone != null && phone.isBlank()) {
            phone = null;
        }

        // Hash password securely through BCrypt PasswordEncoder
        String passwordHash = passwordEncoder.encode(request.password());

        User user = new User(
                normalizedEmail,
                passwordHash,
                firstName,
                lastName,
                phone,
                requestedRole
        );
        user.setRole(requestedRole);
        user.setActive(true);

        try {
            User saved = userRepository.saveAndFlush(user);
            return StaffProvisioningResponse.fromEntity(saved);
        } catch (DataIntegrityViolationException ex) {
            // Guard against concurrent duplicate insertion race conditions by verifying database constraint
            if (isEmailUniqueConstraintViolation(ex)) {
                throw new DuplicateEmailException("An account with this email address already exists");
            }
            throw ex;
        }
    }

    /**
     * Inspects the exception cause chain to determine if the violation was specifically caused
     * by the email unique constraint (uk_users_email).
     */
    private boolean isEmailUniqueConstraintViolation(Throwable throwable) {
        Throwable current = throwable;
        Set<Throwable> visited = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        while (current != null && visited.add(current)) {
            if (current instanceof org.hibernate.exception.ConstraintViolationException cve) {
                String constraintName = cve.getConstraintName();
                if (isEmailConstraintName(constraintName)) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private static boolean isEmailConstraintName(String constraintName) {
        if (constraintName == null || constraintName.isBlank()) {
            return false;
        }
        // Normalize: remove quotes (single, double, backticks, brackets) and trim
        String normalized = constraintName.replaceAll("[\"'`\\[\\]]", "").trim().toLowerCase();
        // Strip schema or table qualification if present (e.g. "public.uk_users_email" -> "uk_users_email")
        if (normalized.contains(".")) {
            normalized = normalized.substring(normalized.lastIndexOf('.') + 1);
        }
        // Match exact constraint name or H2 index name variant (e.g. uk_users_email_index_4)
        return normalized.equals("uk_users_email") || normalized.matches("^uk_users_email_index_\\d+$");
    }
}
