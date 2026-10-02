package com.dentcare.patient.service;

import com.dentcare.patient.dto.CreatePatientRequest;
import com.dentcare.patient.dto.PatientResponse;
import com.dentcare.patient.dto.PatientSummaryResponse;
import com.dentcare.patient.dto.UpdatePatientRequest;
import com.dentcare.patient.dto.UpdatePatientStatusRequest;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.validation.ValidationAutoConfiguration;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

@DataJpaTest
@Import({PatientServiceImpl.class, ValidationAutoConfiguration.class})
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-patient.sql")
class PatientServicePersistenceTest {
    @Autowired private PatientService service;
    @Autowired private PatientRepository repository;
    @Autowired private TestEntityManager entityManager;

    @Test
    void createAndUpdateReturnNormalizedPersistedFieldsAndTimestamps() {
        CreatePatientRequest request = request("  CLINIC-EXPLICIT  ", "  First  ", Gender.FEMALE);
        request.setLastName("  Last  ");
        request.setPhone("  123  ");
        request.setEmail("FIRST@EXAMPLE.COM");
        PatientResponse created = service.createPatient(request);
        assertThat(created.id()).isNotNull();
        assertThat(created.patientCode()).isEqualTo("CLINIC-EXPLICIT");
        assertThat(created.firstName()).isEqualTo("First");
        assertThat(created.lastName()).isEqualTo("Last");
        assertThat(created.phone()).isEqualTo("123");
        assertThat(created.email()).isEqualTo("first@example.com");
        assertThat(created.createdAt()).isNotNull();
        assertThat(created.updatedAt()).isNotNull();
        entityManager.clear();
        Patient original = repository.findById(created.id()).orElseThrow();
        assertThat(original.getUserId()).isNull();
        Long version = original.getVersion();
        UpdatePatientRequest update = new UpdatePatientRequest("  Updated  ", "  Name  ",
                LocalDate.of(1992, 2, 2), Gender.OTHER, "  456  ");
        update.setEmail("UPDATED@EXAMPLE.COM");
        PatientResponse updated = service.updatePatient(created.id(), update);
        entityManager.clear();
        Patient reloaded = repository.findById(created.id()).orElseThrow();
        assertThat(updated.firstName()).isEqualTo("Updated");
        assertThat(updated.phone()).isEqualTo("456");
        assertThat(updated.email()).isEqualTo("updated@example.com");
        // H2 TIMESTAMP rounds Java nanoseconds to microseconds on reload.
        assertThat(updated.createdAt()).isCloseTo(created.createdAt(), within(1, ChronoUnit.MICROS));
        assertThat(updated.updatedAt()).isAfterOrEqualTo(created.updatedAt());
        assertThat(updated.updatedAt()).isCloseTo(reloaded.getUpdatedAt(), within(1, ChronoUnit.MICROS));
        assertThat(reloaded.getVersion()).isGreaterThan(version);
        assertThat(reloaded.getPatientCode()).isEqualTo("CLINIC-EXPLICIT");
    }

    @Test
    void profileAndLifecycleUpdatesPreserveLinkedAccountAndSamePatientRow() {
        entityManager.getEntityManager().createNativeQuery(
                "INSERT INTO users (email, password_hash, first_name, last_name, role) "
                        + "VALUES ('slice3-fixture@example.com', 'test-fixture', 'Test', 'User', 'PATIENT')")
                .executeUpdate();
        Long userId = ((Number) entityManager.getEntityManager().createNativeQuery(
                "SELECT id FROM users WHERE email = 'slice3-fixture@example.com'").getSingleResult()).longValue();
        Patient patient = new Patient("LINKED", "First", "Last", LocalDate.of(1990, 1, 1), Gender.OTHER, "123");
        patient.setUserId(userId);
        repository.saveAndFlush(patient);
        Long id = patient.getId();
        UpdatePatientRequest update = new UpdatePatientRequest("Updated", "Last", LocalDate.of(1990, 1, 1), Gender.OTHER, "456");
        update.setAllergies("Allergy history");
        update.setMedicalConditions("Conditions");
        update.setCurrentMedications("Medications");
        update.setDentalHistory("Dental history");
        update.setNotes("Notes");
        service.updatePatient(id, update);
        PatientResponse deactivated = service.updatePatientStatus(id, new UpdatePatientStatusRequest(false, "Relocated"));
        entityManager.clear();
        assertThat(service.getPatientById(id).active()).isFalse();
        PatientResponse reactivated = service.updatePatientStatus(id, new UpdatePatientStatusRequest(true));
        entityManager.clear();
        Patient reloaded = repository.findById(id).orElseThrow();
        assertThat(repository.count()).isEqualTo(1);
        assertThat(reloaded.getUserId()).isEqualTo(userId);
        assertThat(reloaded.getPatientCode()).isEqualTo("LINKED");
        assertThat(reloaded.isActive()).isTrue();
        assertThat(reactivated.id()).isEqualTo(id);
        assertThat(reactivated.deactivatedAt()).isCloseTo(deactivated.deactivatedAt(), within(1, ChronoUnit.MICROS));
        assertThat(reactivated.deactivationReason()).isEqualTo("Relocated");
        assertThat(reloaded.getAllergies()).isEqualTo("Allergy history");
        assertThat(reloaded.getMedicalConditions()).isEqualTo("Conditions");
        assertThat(reloaded.getCurrentMedications()).isEqualTo("Medications");
        assertThat(reloaded.getDentalHistory()).isEqualTo("Dental history");
        assertThat(reloaded.getNotes()).isEqualTo("Notes");
        LocalDateTime updatedAt = reloaded.getUpdatedAt();
        Long version = reloaded.getVersion();
        service.updatePatientStatus(id, new UpdatePatientStatusRequest(true));
        entityManager.flush();
        entityManager.clear();
        Patient unchanged = repository.findById(id).orElseThrow();
        assertThat(unchanged.getVersion()).isEqualTo(version);
        assertThat(unchanged.getUpdatedAt()).isEqualTo(updatedAt);
    }

    @Test
    void searchCombinesAllFiltersInDatabaseAndPreservesPageBoundaries() {
        service.createPatient(request("P-A", "Anna", Gender.FEMALE));
        service.createPatient(request("P-B", "Beth", Gender.FEMALE));
        service.createPatient(request("P-C", "Carl", Gender.MALE));
        PatientResponse inactive = service.createPatient(request("P-D", "Dana", Gender.FEMALE));
        service.updatePatientStatus(inactive.id(), new UpdatePatientStatusRequest(false));
        service.createPatient(request("OTHER", "Else", Gender.FEMALE));
        entityManager.clear();
        Sort sort = Sort.by("firstName");
        Page<PatientSummaryResponse> first = service.searchPatients("p-", true, Gender.FEMALE, PageRequest.of(0, 1, sort));
        Page<PatientSummaryResponse> second = service.searchPatients("p-", true, Gender.FEMALE, PageRequest.of(1, 1, sort));
        assertThat(first.getContent()).extracting(PatientSummaryResponse::patientCode).containsExactly("P-A");
        assertThat(second.getContent()).extracting(PatientSummaryResponse::patientCode).containsExactly("P-B");
        assertThat(first.getTotalElements()).isEqualTo(2);
        assertThat(first.getTotalPages()).isEqualTo(2);
        assertThat(service.searchPatients(null, false, null, PageRequest.of(0, 10)).getContent())
                .extracting(PatientSummaryResponse::patientCode).containsExactly("P-D");
    }

    @Test
    void invalidProfileUpdateLeavesPersistentPatientUntouched() {
        PatientResponse created = service.createPatient(request("VALID", "First", Gender.OTHER));
        UpdatePatientRequest invalid = new UpdatePatientRequest("Changed", "Name", LocalDate.now().plusDays(1), Gender.OTHER, "123");
        assertThatThrownBy(() -> service.updatePatient(created.id(), invalid)).isInstanceOf(ConstraintViolationException.class);
        entityManager.clear();
        Patient patient = repository.findById(created.id()).orElseThrow();
        assertThat(patient.getFirstName()).isEqualTo("First");
        assertThat(patient.getDateOfBirth()).isEqualTo(LocalDate.of(1990, 1, 1));
    }

    private CreatePatientRequest request(String code, String firstName, Gender gender) {
        return new CreatePatientRequest(code, firstName, "Last", LocalDate.of(1990, 1, 1), gender, "123");
    }
}
