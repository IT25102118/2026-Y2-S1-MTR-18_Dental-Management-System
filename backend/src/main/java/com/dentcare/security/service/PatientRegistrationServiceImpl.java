package com.dentcare.security.service;

import com.dentcare.security.dto.PatientRegistrationRequest;
import com.dentcare.security.dto.PatientRegistrationResponse;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.exception.DuplicateEmailException;
import com.dentcare.security.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of PatientRegistrationService enforcing strict business constraints:
 * - Role is unconditionally assigned to Role.PATIENT regardless of client inputs.
 * - Email is normalized (trimmed and lowercased).
 * - Duplicate email checks prevent collisions with user-friendly error messages.
 * - Raw passwords are never stored; only BCrypt hashes are persisted.
 */
@Service
public class PatientRegistrationServiceImpl implements PatientRegistrationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PatientRegistrationServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public PatientRegistrationResponse registerPatient(PatientRegistrationRequest request) {
        String normalizedEmail = request.email() != null ? request.email().trim().toLowerCase() : "";

        // Pre-check for duplicate email to provide friendly domain exception
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

        // Always enforce Role.PATIENT and active = true
        User user = new User(
                normalizedEmail,
                passwordHash,
                firstName,
                lastName,
                phone,
                Role.PATIENT
        );
        user.setRole(Role.PATIENT);
        user.setActive(true);

        try {
            User saved = userRepository.saveAndFlush(user);
            return PatientRegistrationResponse.fromEntity(saved);
        } catch (DataIntegrityViolationException ex) {
            // Guard against concurrent duplicate insertion race conditions
            throw new DuplicateEmailException("An account with this email address already exists");
        }
    }
}
