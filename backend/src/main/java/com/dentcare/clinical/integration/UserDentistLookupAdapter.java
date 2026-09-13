package com.dentcare.clinical.integration;

import com.dentcare.security.entity.Role;
import com.dentcare.security.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Adapter implementing {@link DentistLookupPort} by delegating to the existing
 * {@link UserRepository} and verifying that the user has {@link Role#DENTIST} and is active.
 */
@Component
public class UserDentistLookupAdapter implements DentistLookupPort {

    private final UserRepository userRepository;

    public UserDentistLookupAdapter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean existsActiveDentist(Long dentistId) {
        if (dentistId == null) {
            return false;
        }
        return userRepository.findById(dentistId)
                .filter(user -> user.isActive() && user.getRole() == Role.DENTIST)
                .isPresent();
    }
}
