package com.dentcare.clinical.security;

import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.security.entity.User;
import com.dentcare.security.model.DentCareUserDetails;
import com.dentcare.security.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolver mapping the currently authenticated SecurityContext principal to a verified domain {@link Dentist}.
 */
@Component
public class CurrentDentistProvider {

    private final DentistLookupPort dentistLookupPort;
    private final UserRepository userRepository;

    public CurrentDentistProvider(DentistLookupPort dentistLookupPort, UserRepository userRepository) {
        this.dentistLookupPort = dentistLookupPort;
        this.userRepository = userRepository;
    }

    /**
     * Resolves the current authenticated user as an active, verified domain {@link Dentist}.
     *
     * @return the domain Dentist
     * @throws UnauthorizedClinicalOperationException if unauthenticated, principal is missing, or not an active dentist
     */
    public Dentist getCurrentDentist() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new UnauthorizedClinicalOperationException("No authenticated user in security context");
        }

        Object principal = auth.getPrincipal();
        Long userId = null;
        String email = null;
        String firstName = null;
        String lastName = null;

        if (principal instanceof DentCareUserDetails userDetails) {
            userId = userDetails.getId();
            email = userDetails.getEmail();
            firstName = userDetails.getFirstName();
            lastName = userDetails.getLastName();
        } else if (principal instanceof User user) {
            userId = user.getId();
            email = user.getEmail();
            firstName = user.getFirstName();
            lastName = user.getLastName();
        } else if (principal instanceof String username) {
            email = username;
            User user = userRepository.findByEmail(username)
                    .or(() -> userRepository.findByEmailIgnoreCase(username))
                    .orElseThrow(() -> new UnauthorizedClinicalOperationException("User not found: " + username));
            userId = user.getId();
            firstName = user.getFirstName();
            lastName = user.getLastName();
        } else {
            throw new UnauthorizedClinicalOperationException(
                    "Unsupported principal type: " + principal.getClass().getName()
            );
        }

        if (userId == null || !dentistLookupPort.existsActiveDentist(userId)) {
            throw new UnauthorizedClinicalOperationException(
                    "Authenticated user " + userId + " is not an active dentist authorized to perform clinical operations"
            );
        }

        return new Dentist(userId, email, firstName, lastName);
    }

    /**
     * Convenience method returning the ID of the authenticated dentist.
     *
     * @return dentist user ID
     */
    public Long getCurrentDentistId() {
        return getCurrentDentist().id();
    }
}
