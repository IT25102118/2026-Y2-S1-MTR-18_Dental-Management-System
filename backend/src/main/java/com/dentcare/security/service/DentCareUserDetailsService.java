package com.dentcare.security.service;

import com.dentcare.security.entity.User;
import com.dentcare.security.model.DentCareUserDetails;
import com.dentcare.security.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service implementing UserDetailsService using persistent DentCare User entity.
 * Normalizes email and exposes active state through UserDetails.isEnabled().
 */
@Service
public class DentCareUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public DentCareUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.isBlank()) {
            throw new UsernameNotFoundException("Email must not be empty");
        }
        String normalizedEmail = username.trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new UsernameNotFoundException("No user found with email: " + normalizedEmail));
        return new DentCareUserDetails(user);
    }
}
