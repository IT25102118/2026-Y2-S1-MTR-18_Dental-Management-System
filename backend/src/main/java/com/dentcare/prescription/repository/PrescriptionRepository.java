package com.dentcare.prescription.repository;

import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Prescription} entity.
 */
@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    /**
     * Retrieves a prescription with its items eagerly loaded, avoiding N+1 on detail view.
     */
    @Query("SELECT p FROM Prescription p LEFT JOIN FETCH p.items WHERE p.id = :id")
    Optional<Prescription> findByIdWithItems(@Param("id") Long id);

    /**
     * Lists prescriptions for a specific patient, ordered by creation date descending.
     */
    Page<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId, Pageable pageable);

    /**
     * Lists prescriptions for a specific dentist, ordered by creation date descending.
     */
    Page<Prescription> findByDentistIdOrderByCreatedAtDesc(Long dentistId, Pageable pageable);

    /**
     * Lists prescriptions for a specific patient filtered by status.
     */
    Page<Prescription> findByPatientIdAndStatusOrderByCreatedAtDesc(Long patientId, PrescriptionStatus status, Pageable pageable);
}
