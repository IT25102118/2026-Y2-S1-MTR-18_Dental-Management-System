package com.dentcare.patient.repository;

import com.dentcare.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Patient} entity.
 * Provides primary key lookup, business code lookups, active status filtering,
 * and specification-based search and pagination.
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, Long>, JpaSpecificationExecutor<Patient> {

    /**
     * Finds a patient by unique patient business code.
     */
    Optional<Patient> findByPatientCode(String patientCode);

    /**
     * Checks if a patient exists with the specified patient code.
     */
    boolean existsByPatientCode(String patientCode);

    /**
     * Finds a patient linked to the specified user account ID.
     */
    Optional<Patient> findByUserId(Long userId);

    /**
     * Checks if a patient record exists for the specified user account ID.
     */
    boolean existsByUserId(Long userId);

    /**
     * Retrieves all active patients.
     */
    List<Patient> findByActiveTrue();

    /**
     * Retrieves patients matching the specified active status.
     */
    List<Patient> findByActive(boolean active);

    /**
     * Retrieves a paginated list of patients matching the specified active status.
     */
    Page<Patient> findByActive(boolean active, Pageable pageable);
}
