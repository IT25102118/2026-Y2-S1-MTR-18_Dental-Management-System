package com.dentcare.patient.repository;

import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-patient.sql")
class PatientRepositoryTest {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Patient entity persists and reloads all core demographic and clinical fields correctly")
    void testPersistAndReloadCoreFields() {
        Patient patient = new Patient(
                "PAT-2026-00001",
                "Jane",
                "Doe",
                LocalDate.of(1990, 5, 15),
                Gender.FEMALE,
                "+1-555-0100"
        );
        patient.setEmail("jane.doe@example.com");
        patient.setAddressLine1("123 Main Street");
        patient.setAddressLine2("Suite 4B");
        patient.setCity("Metropolis");
        patient.setEmergencyContactName("John Doe");
        patient.setEmergencyContactPhone("+1-555-0199");
        patient.setEmergencyContactRelationship("Spouse");
        patient.setAllergies("Penicillin");
        patient.setMedicalConditions("Hypertension");
        patient.setCurrentMedications("Lisinopril 10mg");
        patient.setDentalHistory("Root canal on tooth #19 (2022)");
        patient.setNotes("Prefers afternoon appointments");

        Patient saved = patientRepository.save(patient);
        entityManager.flush();
        entityManager.clear();

        Optional<Patient> reloadedOpt = patientRepository.findById(saved.getId());
        assertThat(reloadedOpt).isPresent();

        Patient reloaded = reloadedOpt.get();
        assertThat(reloaded.getPatientCode()).isEqualTo("PAT-2026-00001");
        assertThat(reloaded.getFirstName()).isEqualTo("Jane");
        assertThat(reloaded.getLastName()).isEqualTo("Doe");
        assertThat(reloaded.getDateOfBirth()).isEqualTo(LocalDate.of(1990, 5, 15));
        assertThat(reloaded.getGender()).isEqualTo(Gender.FEMALE);
        assertThat(reloaded.getEmail()).isEqualTo("jane.doe@example.com");
        assertThat(reloaded.getPhone()).isEqualTo("+1-555-0100");
        assertThat(reloaded.getAddressLine1()).isEqualTo("123 Main Street");
        assertThat(reloaded.getAddressLine2()).isEqualTo("Suite 4B");
        assertThat(reloaded.getCity()).isEqualTo("Metropolis");
        assertThat(reloaded.getEmergencyContactName()).isEqualTo("John Doe");
        assertThat(reloaded.getEmergencyContactPhone()).isEqualTo("+1-555-0199");
        assertThat(reloaded.getEmergencyContactRelationship()).isEqualTo("Spouse");
        assertThat(reloaded.getAllergies()).isEqualTo("Penicillin");
        assertThat(reloaded.getMedicalConditions()).isEqualTo("Hypertension");
        assertThat(reloaded.getCurrentMedications()).isEqualTo("Lisinopril 10mg");
        assertThat(reloaded.getDentalHistory()).isEqualTo("Root canal on tooth #19 (2022)");
        assertThat(reloaded.getNotes()).isEqualTo("Prefers afternoon appointments");
        assertThat(reloaded.isActive()).isTrue();
        assertThat(reloaded.getVersion()).isNotNull();
        assertThat(reloaded.getCreatedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();
        assertThat(reloaded.getUserId()).isNull();
        assertThat(patientRepository.findById(Long.MAX_VALUE)).isEmpty();
    }

    @Test
    @DisplayName("Duplicate patientCode is rejected by unique constraint")
    void testUniquePatientCodeConstraint() {
        Patient patient1 = new Patient(
                "PAT-DUP-001",
                "Alice",
                "Smith",
                LocalDate.of(1985, 3, 20),
                Gender.FEMALE,
                "+1-555-0101"
        );
        patientRepository.save(patient1);
        entityManager.flush();

        Patient patient2 = new Patient(
                "PAT-DUP-001",
                "Bob",
                "Jones",
                LocalDate.of(1992, 8, 10),
                Gender.MALE,
                "+1-555-0102"
        );

        assertThatThrownBy(() -> {
            patientRepository.save(patient2);
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Duplicate userId is rejected by unique constraint")
    void testUniqueUserIdConstraint() {
        Long userId = createTestUser("duplicate.test@example.com");

        Patient patient1 = new Patient(
                "PAT-USR-001",
                "Charlie",
                "Brown",
                LocalDate.of(1978, 11, 2),
                Gender.MALE,
                "+1-555-0103"
        );
        patient1.setUserId(userId);
        patientRepository.save(patient1);
        entityManager.flush();

        Patient patient2 = new Patient(
                "PAT-USR-002",
                "Dana",
                "White",
                LocalDate.of(1988, 4, 18),
                Gender.FEMALE,
                "+1-555-0104"
        );
        patient2.setUserId(userId);

        assertThatThrownBy(() -> {
            patientRepository.save(patient2);
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("findByPatientCode and existsByPatientCode return expected results")
    void testFindByPatientCodeAndExists() {
        Patient patient = new Patient(
                "PAT-CODE-001",
                "Evan",
                "Davis",
                LocalDate.of(1995, 7, 24),
                Gender.MALE,
                "+1-555-0105"
        );
        patientRepository.save(patient);
        entityManager.flush();
        entityManager.clear();

        Optional<Patient> found = patientRepository.findByPatientCode("PAT-CODE-001");
        assertThat(found).isPresent();
        assertThat(found.get().getFirstName()).isEqualTo("Evan");

        assertThat(patientRepository.existsByPatientCode("PAT-CODE-001")).isTrue();
        assertThat(patientRepository.existsByPatientCode("NON-EXISTENT")).isFalse();
        assertThat(patientRepository.findByPatientCode("NON-EXISTENT")).isEmpty();
    }

    @Test
    @DisplayName("findByUserId and existsByUserId return expected results")
    void testFindByUserIdAndExists() {
        Long userId = createTestUser("lookup.test@example.com");

        Patient patient = new Patient(
                "PAT-USR-LOOKUP",
                "Fiona",
                "Gallagher",
                LocalDate.of(1993, 1, 30),
                Gender.FEMALE,
                "+1-555-0106"
        );
        patient.setUserId(userId);
        patientRepository.save(patient);
        entityManager.flush();
        entityManager.clear();

        Optional<Patient> found = patientRepository.findByUserId(userId);
        assertThat(found).isPresent();
        assertThat(found.get().getPatientCode()).isEqualTo("PAT-USR-LOOKUP");

        assertThat(patientRepository.existsByUserId(userId)).isTrue();
        assertThat(patientRepository.existsByUserId(9999L)).isFalse();
        assertThat(patientRepository.findByUserId(9999L)).isEmpty();
    }

    private Long createTestUser(String email) {
        entityManager.getEntityManager()
                .createNativeQuery("INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (:email, 'hash', 'Test', 'User', 'PATIENT')")
                .setParameter("email", email)
                .executeUpdate();
        Number id = (Number) entityManager.getEntityManager()
                .createNativeQuery("SELECT id FROM users WHERE email = :email")
                .setParameter("email", email)
                .getSingleResult();
        return id.longValue();
    }

    @Test
    @DisplayName("Active/deactivated querying correctly separates active and inactive patient records")
    void testActiveStatusQueries() {
        Patient activePatient = new Patient(
                "PAT-ACT-001",
                "George",
                "Clark",
                LocalDate.of(1982, 6, 12),
                Gender.MALE,
                "+1-555-0107"
        );
        activePatient.setActive(true);
        patientRepository.save(activePatient);

        Patient inactivePatient = new Patient(
                "PAT-INACT-001",
                "Hannah",
                "Abbott",
                LocalDate.of(1991, 9, 3),
                Gender.FEMALE,
                "+1-555-0108"
        );
        inactivePatient.setActive(false);
        inactivePatient.setDeactivationReason("Moved to another city");
        patientRepository.save(inactivePatient);

        entityManager.flush();
        entityManager.clear();

        List<Patient> activeList = patientRepository.findByActiveTrue();
        assertThat(activeList)
                .extracting(Patient::getPatientCode)
                .contains("PAT-ACT-001")
                .doesNotContain("PAT-INACT-001");

        List<Patient> inactiveList = patientRepository.findByActive(false);
        assertThat(inactiveList)
                .extracting(Patient::getPatientCode)
                .contains("PAT-INACT-001")
                .doesNotContain("PAT-ACT-001");

        Page<Patient> activePage = patientRepository.findByActive(true, PageRequest.of(0, 10));
        assertThat(activePage.getContent())
                .extracting(Patient::getPatientCode)
                .contains("PAT-ACT-001")
                .doesNotContain("PAT-INACT-001");

        Page<Patient> inactivePage = patientRepository.findByActive(false, PageRequest.of(0, 1));
        assertThat(inactivePage.getContent()).extracting(Patient::getPatientCode)
                .containsExactly("PAT-INACT-001");
        assertThat(inactivePage.getTotalElements()).isEqualTo(1);
    }
}
