package com.dentcare.clinical.integration;

import com.dentcare.security.entity.Role;
import com.dentcare.security.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Adapter implementing {@link PatientLookupPort} by delegating to the existing
 * {@link UserRepository} and verifying that the user has {@link Role#PATIENT} and is active.
 */
@Component
public class UserPatientLookupAdapter implements PatientLookupPort {

    private final UserRepository userRepository;

    public UserPatientLookupAdapter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean existsActivePatient(Long patientId) {
        if (patientId == null) {
            return false;
        }
        return userRepository.findById(patientId)
                .filter(user -> user.isActive() && user.getRole() == Role.PATIENT)
                .isPresent();
    }
}
