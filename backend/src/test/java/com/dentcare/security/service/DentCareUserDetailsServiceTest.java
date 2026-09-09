package com.dentcare.security.service;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.model.DentCareUserDetails;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DentCareUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DentCareUserDetailsService userDetailsService;

    @Test
    @DisplayName("Loads active user with case-insensitive normalized email")
    void loadUserByUsername_activeUser_returnsUserDetails() {
        User user = new User(
                "dentist@dentcare.com",
                "$2a$10$someHashedPasswordVal",
                "Alice",
                "Perera",
                "0771234567",
                Role.DENTIST
        );
        user.setId(10L);
        user.setActive(true);

        when(userRepository.findByEmailIgnoreCase("dentist@dentcare.com")).thenReturn(Optional.of(user));

        DentCareUserDetails details = (DentCareUserDetails) userDetailsService.loadUserByUsername("  DENTIST@DentCare.com  ");

        assertThat(details).isNotNull();
        assertThat(details.getId()).isEqualTo(10L);
        assertThat(details.getUsername()).isEqualTo("dentist@dentcare.com");
        assertThat(details.getPassword()).isEqualTo("$2a$10$someHashedPasswordVal");
        assertThat(details.getFirstName()).isEqualTo("Alice");
        assertThat(details.getLastName()).isEqualTo("Perera");
        assertThat(details.getRole()).isEqualTo(Role.DENTIST);
        assertThat(details.isEnabled()).isTrue();
        assertThat(details.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_DENTIST");

        verify(userRepository).findByEmailIgnoreCase("dentist@dentcare.com");
    }

    @Test
    @DisplayName("Inactive user maps to isEnabled=false")
    void loadUserByUsername_inactiveUser_isEnabledFalse() {
        User user = new User(
                "inactive@dentcare.com",
                "$2a$10$hash",
                "Inactive",
                "User",
                null,
                Role.RECEPTIONIST
        );
        user.setId(11L);
        user.setActive(false);

        when(userRepository.findByEmailIgnoreCase("inactive@dentcare.com")).thenReturn(Optional.of(user));

        DentCareUserDetails details = (DentCareUserDetails) userDetailsService.loadUserByUsername("inactive@dentcare.com");

        assertThat(details.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("Unknown email throws UsernameNotFoundException")
    void loadUserByUsername_unknownEmail_throwsUsernameNotFoundException() {
        when(userRepository.findByEmailIgnoreCase("unknown@dentcare.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unknown@dentcare.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("unknown@dentcare.com");
    }

    @Test
    @DisplayName("Blank or null username throws UsernameNotFoundException")
    void loadUserByUsername_blankUsername_throwsUsernameNotFoundException() {
        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("   "))
                .isInstanceOf(UsernameNotFoundException.class);
        assertThatThrownBy(() -> userDetailsService.loadUserByUsername(null))
                .isInstanceOf(UsernameNotFoundException.class);
    }
}
