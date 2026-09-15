package com.dentcare.patient.repository;

import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-patient.sql")
class PatientRepositoryFilteringTest {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Patient patient1;
    private Patient patient2;
    private Patient patient3;

    @BeforeEach
    void setUp() {
        patientRepository.deleteAll();

        // patient1: Sarah Connor, Female, Active
        patient1 = new Patient("PAT-001", "Sarah", "Connor", LocalDate.of(1985, 2, 28), Gender.FEMALE, "+1-555-1111");
        patient1.setEmail("sarah.connor@cyberdyne.org");
        patient1.setCity("Los Angeles");
        patient1.setActive(true);

        // patient2: John Connor, Male, Active
        patient2 = new Patient("PAT-002", "John", "Connor", LocalDate.of(2000, 3, 1), Gender.MALE, "+1-555-2222");
        patient2.setEmail("john.connor@resistance.net");
        patient2.setCity("Los Angeles");
        patient2.setActive(true);

        // patient3: Kyle Reese, Male, Inactive
        patient3 = new Patient("PAT-003", "Kyle", "Reese", LocalDate.of(1995, 8, 15), Gender.MALE, "+1-555-3333");
        patient3.setEmail("kyle.reese@future.org");
        patient3.setCity("New York");
        patient3.setActive(false);
        patient3.setDeactivationReason("Record archived");

        patientRepository.save(patient1);
        patientRepository.save(patient2);
        patientRepository.save(patient3);

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Search filter matches patient code case-insensitively")
    void testSearchByPatientCode() {
        Specification<Patient> spec = PatientSpecifications.buildSpecification("pat-001", null);
        Page<Patient> results = patientRepository.findAll(spec, PageRequest.of(0, 10));

        assertThat(results.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-001");
    }

    @Test
    @DisplayName("Search filter matches first name or last name case-insensitively")
    void testSearchByName() {
        Specification<Patient> specConnor = PatientSpecifications.buildSpecification("connor", null);
        Page<Patient> connorResults = patientRepository.findAll(specConnor, PageRequest.of(0, 10));

        assertThat(connorResults.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactlyInAnyOrder("PAT-001", "PAT-002");

        Specification<Patient> specSarah = PatientSpecifications.buildSpecification("sarah", null);
        Page<Patient> sarahResults = patientRepository.findAll(specSarah, PageRequest.of(0, 10));

        assertThat(sarahResults.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-001");
    }

    @Test
    @DisplayName("Search filter matches phone number")
    void testSearchByPhone() {
        Specification<Patient> spec = PatientSpecifications.buildSpecification("555-2222", null);
        Page<Patient> results = patientRepository.findAll(spec, PageRequest.of(0, 10));

        assertThat(results.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-002");
    }

    @Test
    @DisplayName("Search filter matches email address case-insensitively")
    void testSearchByEmail() {
        Specification<Patient> spec = PatientSpecifications.buildSpecification("RESISTANCE.NET", null);
        Page<Patient> results = patientRepository.findAll(spec, PageRequest.of(0, 10));

        assertThat(results.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-002");
    }

    @Test
    @DisplayName("Active filter accurately isolates active vs inactive patient records")
    void testFilterByActiveStatus() {
        Specification<Patient> activeSpec = PatientSpecifications.buildSpecification(null, true);
        Page<Patient> activeResults = patientRepository.findAll(activeSpec, PageRequest.of(0, 10));

        assertThat(activeResults.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactlyInAnyOrder("PAT-001", "PAT-002");

        Specification<Patient> inactiveSpec = PatientSpecifications.buildSpecification(null, false);
        Page<Patient> inactiveResults = patientRepository.findAll(inactiveSpec, PageRequest.of(0, 10));

        assertThat(inactiveResults.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-003");
    }

    @Test
    @DisplayName("Gender filter isolates patients by specified gender")
    void testFilterByGender() {
        Specification<Patient> femaleSpec = PatientSpecifications.buildSpecification(null, null, Gender.FEMALE);
        Page<Patient> femaleResults = patientRepository.findAll(femaleSpec, PageRequest.of(0, 10));

        assertThat(femaleResults.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-001");

        Specification<Patient> maleSpec = PatientSpecifications.buildSpecification(null, null, Gender.MALE);
        Page<Patient> maleResults = patientRepository.findAll(maleSpec, PageRequest.of(0, 10));

        assertThat(maleResults.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactlyInAnyOrder("PAT-002", "PAT-003");
    }

    @Test
    @DisplayName("Combined search, active filter, and gender filter with sorting and pagination")
    void testCombinedSpecificationWithSortingAndPagination() {
        Specification<Patient> combinedSpec = PatientSpecifications.buildSpecification("connor", true, Gender.FEMALE);
        Page<Patient> results = patientRepository.findAll(
                combinedSpec,
                PageRequest.of(0, 10, Sort.by("lastName").ascending().and(Sort.by("firstName").ascending()))
        );

        assertThat(results.getContent())
                .extracting(Patient::getPatientCode)
                .containsExactly("PAT-001");
    }

    @Test
    void searchAndActiveFilterSupportOrderedPageBoundaries() {
        Specification<Patient> spec = PatientSpecifications.buildSpecification("  CONNOR  ", true);
        Sort sort = Sort.by("lastName").ascending().and(Sort.by("firstName").ascending());
        Page<Patient> first = patientRepository.findAll(spec, PageRequest.of(0, 1, sort));
        Page<Patient> second = patientRepository.findAll(spec, PageRequest.of(1, 1, sort));
        Page<Patient> beyond = patientRepository.findAll(spec, PageRequest.of(2, 1, sort));

        assertThat(first.getContent()).extracting(Patient::getPatientCode).containsExactly("PAT-002");
        assertThat(second.getContent()).extracting(Patient::getPatientCode).containsExactly("PAT-001");
        assertThat(first.getTotalElements()).isEqualTo(2);
        assertThat(first.getTotalPages()).isEqualTo(2);
        assertThat(first.hasNext()).isTrue();
        assertThat(second.hasNext()).isFalse();
        assertThat(beyond.getContent()).isEmpty();
        assertThat(beyond.getTotalElements()).isEqualTo(2);
    }

    @Test
    void emptySearchAndAbsentFiltersReturnAllPatients() {
        for (String search : new String[]{null, "", "   "}) {
            Page<Patient> results = patientRepository.findAll(
                    PatientSpecifications.buildSpecification(search, null, null),
                    PageRequest.of(0, 10, Sort.by("patientCode")));
            assertThat(results.getContent()).extracting(Patient::getPatientCode)
                    .containsExactly("PAT-001", "PAT-002", "PAT-003");
        }
        assertThat(patientRepository.findAll(PatientSpecifications.buildSpecification("absent", null),
                PageRequest.of(0, 10))).isEmpty();
    }

    @Test
    void caseInsensitiveSearchDoesNotDependOnDefaultLocale() {
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            Page<Patient> results = patientRepository.findAll(
                    PatientSpecifications.buildSpecification("RESISTANCE.NET", null), PageRequest.of(0, 10));
            assertThat(results.getContent()).extracting(Patient::getPatientCode).containsExactly("PAT-002");
        } finally {
            Locale.setDefault(previous);
        }
    }
}
