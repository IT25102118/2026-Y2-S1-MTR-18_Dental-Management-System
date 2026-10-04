package com.dentcare.appointment.repository;

import com.dentcare.appointment.entity.Appointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Appointment} entity.
 */
@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByPatientIdOrderByAppointmentDateDescCreatedAtDesc(Long patientId);

    Page<Appointment> findByPatientIdOrderByAppointmentDateDescCreatedAtDesc(Long patientId, Pageable pageable);

    @Query("SELECT a FROM Appointment a LEFT JOIN FETCH a.dentist WHERE a.id = :id")
    Optional<Appointment> findByIdWithDentist(@Param("id") Long id);

    long countByPatientId(Long patientId);
}
