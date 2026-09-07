package com.dentcare.security.model;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.core.GrantedAuthority;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DentCareUserDetailsTest {

    @ParameterizedTest
    @EnumSource(Role.class)
    @DisplayName("Every persistent Role enum maps strictly to authority ROLE_<ROLE_NAME>")
    void userDetails_mapsExactRoleAuthority(Role role) {
        User user = new User(
                "user@dentcare.com",
                "$2a$10$hashedPasswordValue",
                "John",
                "Doe",
                "0771234567",
                role
        );
        user.setId(1L);
        user.setActive(true);

        DentCareUserDetails details = new DentCareUserDetails(user);

        assertThat(details.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_" + role.name());
        assertThat(details.getRole()).isEqualTo(role);
        assertThat(details.getId()).isEqualTo(1L);
        assertThat(details.getUsername()).isEqualTo("user@dentcare.com");
        assertThat(details.getPassword()).isEqualTo("$2a$10$hashedPasswordValue");
        assertThat(details.isEnabled()).isTrue();
        assertThat(details.isAccountNonExpired()).isTrue();
        assertThat(details.isAccountNonLocked()).isTrue();
        assertThat(details.isCredentialsNonExpired()).isTrue();
    }

    @Test
    @DisplayName("Inactive user maps isEnabled to false")
    void userDetails_inactiveUser_isEnabledFalse() {
        User user = new User(
                "inactive@dentcare.com",
                "$2a$10$hash",
                "Jane",
                "Doe",
                null,
                Role.PATIENT
        );
        user.setActive(false);

        DentCareUserDetails details = new DentCareUserDetails(user);
        assertThat(details.isEnabled()).isFalse();
    }

    @Test
    @DisplayName("Null user or null role throws NullPointerException")
    void userDetails_nullGuards() {
        assertThatThrownBy(() -> new DentCareUserDetails(null))
                .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> new DentCareUserDetails(1L, "email@test.com", "hash", "F", "L", "P", null, true))
                .isInstanceOf(NullPointerException.class);
    }
}
