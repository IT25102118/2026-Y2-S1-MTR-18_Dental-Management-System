package com.dentcare.clinical.security;

/**
 * Domain representation of an authenticated, verified dentist within the clinical bounded context.
 */
public record Dentist(Long id, String email, String firstName, String lastName) {

    public Dentist(Long id) {
        this(id, null, null, null);
    }

    public Long getId() {
        return id;
    }
}
