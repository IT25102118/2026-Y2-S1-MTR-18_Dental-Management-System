package com.dentcare.clinical.security;

import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.security.entity.User;
import com.dentcare.security.model.DentCareUserDetails;
import com.dentcare.security.entity.Role;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentDentistProviderTest {

    @Mock
    private DentistLookupPort dentistLookupPort;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CurrentDentistProvider currentDentistProvider;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentDentist_throwsWhenNoAuthentication() {
        SecurityContextHolder.getContext().setAuthentication(null);

        assertThatThrownBy(() -> currentDentistProvider.getCurrentDentist())
                .isInstanceOf(UnauthorizedClinicalOperationException.class)
                .hasMessageContaining("No authenticated user");
    }

    @Test
    void getCurrentDentist_throwsWhenNotAuthenticated() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(false);
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThatThrownBy(() -> currentDentistProvider.getCurrentDentist())
                .isInstanceOf(UnauthorizedClinicalOperationException.class)
                .hasMessageContaining("No authenticated user");
    }

    @Test
    void getCurrentDentist_throwsWhenAnonymousUser() {
        Authentication auth = new UsernamePasswordAuthenticationToken("anonymousUser", null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThatThrownBy(() -> currentDentistProvider.getCurrentDentist())
                .isInstanceOf(UnauthorizedClinicalOperationException.class)
                .hasMessageContaining("No authenticated user");
    }

    @Test
    void getCurrentDentist_throwsWhenPrincipalTypeUnsupported() {
        Authentication auth = new UsernamePasswordAuthenticationToken(12345, "credentials", Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        assertThatThrownBy(() -> currentDentistProvider.getCurrentDentist())
                .isInstanceOf(UnauthorizedClinicalOperationException.class)
                .hasMessageContaining("Unsupported principal type");
    }

    @Test
    void getCurrentDentist_throwsWhenUserNotActiveDentist() {
        User user = createUser(10L, "dentist@dentcare.com", Role.DENTIST);
        DentCareUserDetails userDetails = new DentCareUserDetails(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, "pass", userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(dentistLookupPort.existsActiveDentist(10L)).thenReturn(false);

        assertThatThrownBy(() -> currentDentistProvider.getCurrentDentist())
                .isInstanceOf(UnauthorizedClinicalOperationException.class)
                .hasMessageContaining("not an active dentist");
    }

    @Test
    void getCurrentDentist_resolvesDentCareUserDetails() {
        User user = createUser(10L, "dentist@dentcare.com", Role.DENTIST);
        DentCareUserDetails userDetails = new DentCareUserDetails(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, "pass", userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(dentistLookupPort.existsActiveDentist(10L)).thenReturn(true);

        Dentist dentist = currentDentistProvider.getCurrentDentist();

        assertThat(dentist).isNotNull();
        assertThat(dentist.id()).isEqualTo(10L);
        assertThat(dentist.email()).isEqualTo("dentist@dentcare.com");
        assertThat(dentist.firstName()).isEqualTo("Jane");
        assertThat(dentist.lastName()).isEqualTo("Doe");
        assertThat(currentDentistProvider.getCurrentDentistId()).isEqualTo(10L);
    }

    @Test
    void getCurrentDentist_resolvesUserPrincipal() {
        User user = createUser(15L, "dentist2@dentcare.com", Role.DENTIST);
        Authentication auth = new UsernamePasswordAuthenticationToken(user, "pass", Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(dentistLookupPort.existsActiveDentist(15L)).thenReturn(true);

        Dentist dentist = currentDentistProvider.getCurrentDentist();

        assertThat(dentist).isNotNull();
        assertThat(dentist.id()).isEqualTo(15L);
        assertThat(dentist.email()).isEqualTo("dentist2@dentcare.com");
    }

    @Test
    void getCurrentDentist_resolvesStringUsernameViaRepository() {
        User user = createUser(20L, "dentist3@dentcare.com", Role.DENTIST);
        Authentication auth = new UsernamePasswordAuthenticationToken("dentist3@dentcare.com", "pass", Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findByEmail("dentist3@dentcare.com")).thenReturn(Optional.of(user));
        when(dentistLookupPort.existsActiveDentist(20L)).thenReturn(true);

        Dentist dentist = currentDentistProvider.getCurrentDentist();

        assertThat(dentist).isNotNull();
        assertThat(dentist.id()).isEqualTo(20L);
        assertThat(dentist.email()).isEqualTo("dentist3@dentcare.com");
    }

    @Test
    void getCurrentDentist_throwsWhenStringUsernameNotFound() {
        Authentication auth = new UsernamePasswordAuthenticationToken("unknown@dentcare.com", "pass", Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findByEmail("unknown@dentcare.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("unknown@dentcare.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> currentDentistProvider.getCurrentDentist())
                .isInstanceOf(UnauthorizedClinicalOperationException.class)
                .hasMessageContaining("User not found");
    }

    private User createUser(Long id, String email, Role role) {
        User user = new User(email, "hash", "Jane", "Doe", "0771234567", role);
        user.setId(id);
        user.setActive(true);
        return user;
    }
}
