package com.dentcare.patient.repository;

import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

/**
 * Reusable JPA Specifications for dynamic searching, filtering, and pagination of {@link Patient} records.
 */
public final class PatientSpecifications {

    private PatientSpecifications() {
    }

    /**
     * Matches search text against patient code, first name, last name, phone, or email case-insensitively.
     */
    public static Specification<Patient> hasSearchText(String search) {
        if (search == null || search.trim().isEmpty()) {
            return null;
        }
        return (root, query, cb) -> {
            String escaped = search.trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            String pattern = "%" + escaped + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("patientCode")), pattern, '\\'),
                    cb.like(cb.lower(root.get("firstName")), pattern, '\\'),
                    cb.like(cb.lower(root.get("lastName")), pattern, '\\'),
                    cb.like(cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), root.get("lastName"))), pattern, '\\'),
                    cb.like(cb.lower(root.get("phone")), pattern, '\\'),
                    cb.like(cb.lower(root.get("email")), pattern, '\\')
            );
        };
    }

    /**
     * Filters patients by active status.
     */
    public static Specification<Patient> hasActiveStatus(Boolean active) {
        if (active == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("active"), active);
    }

    /**
     * Filters patients by biological/administrative gender.
     */
    public static Specification<Patient> hasGender(Gender gender) {
        if (gender == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("gender"), gender);
    }

    /**
     * Combines search text and active status specifications.
     */
    public static Specification<Patient> buildSpecification(String search, Boolean active) {
        return Specification.allOf(
                hasSearchText(search),
                hasActiveStatus(active)
        );
    }

    /**
     * Combines search text, active status, and gender specifications.
     */
    public static Specification<Patient> buildSpecification(String search, Boolean active, Gender gender) {
        return Specification.allOf(
                hasSearchText(search),
                hasActiveStatus(active),
                hasGender(gender)
        );
    }
}
