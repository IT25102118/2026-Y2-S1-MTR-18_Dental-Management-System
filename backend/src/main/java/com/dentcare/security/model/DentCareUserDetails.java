package com.dentcare.security.model;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * DentCare UserDetails implementation wrapping persistent User account details.
 * Ensures authorities are strictly mapped to ROLE_<ROLE_ENUM> with no client-controlled role data.
 */
public class DentCareUserDetails implements UserDetails, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String email;
    private final String passwordHash;
    private final String firstName;
    private final String lastName;
    private final String phone;
    private final Role role;
    private final boolean active;
    private final Collection<? extends GrantedAuthority> authorities;

    public DentCareUserDetails(User user) {
        Objects.requireNonNull(user, "User entity must not be null");
        this.id = user.getId();
        this.email = user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "";
        this.passwordHash = user.getPasswordHash();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.phone = user.getPhone();
        this.role = Objects.requireNonNull(user.getRole(), "User role must not be null");
        this.active = user.isActive();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + this.role.name()));
    }

    public DentCareUserDetails(Long id, String email, String passwordHash, String firstName, String lastName,
                               String phone, Role role, boolean active) {
        this.id = id;
        this.email = email != null ? email.trim().toLowerCase() : "";
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.role = Objects.requireNonNull(role, "Role must not be null");
        this.active = active;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + this.role.name()));
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getPhone() {
        return phone;
    }

    public Role getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
