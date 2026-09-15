package com.dentcare.patient.dto;

import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.BeanWrapperImpl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PatientDtoValidationTest {

    private static Validator validator;
    private static ValidatorFactory factory;

    @BeforeAll
    static void setUpValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidatorFactory() {
        factory.close();
    }

    @Test
    @DisplayName("CreatePatientRequest with valid fields passes validation")
    void testCreatePatientRequestValid() {
        CreatePatientRequest request = new CreatePatientRequest(
                "PAT-001",
                "Bruce",
                "Wayne",
                LocalDate.of(1980, 4, 17),
                Gender.MALE,
                "+1-555-9999"
        );
        request.setEmail("bruce.wayne@waynecorp.com");

        Set<ConstraintViolation<CreatePatientRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("CreatePatientRequest with missing required fields fails validation")
    void testCreatePatientRequestMissingRequiredFields() {
        CreatePatientRequest request = new CreatePatientRequest();

        Set<ConstraintViolation<CreatePatientRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("patientCode", "firstName", "lastName", "dateOfBirth", "gender", "phone");
    }

    @Test
    @DisplayName("CreatePatientRequest with future date of birth fails validation")
    void testCreatePatientRequestFutureDobFails() {
        CreatePatientRequest request = new CreatePatientRequest(
                "PAT-002",
                "Clark",
                "Kent",
                LocalDate.now().plusDays(1),
                Gender.MALE,
                "+1-555-8888"
        );

        Set<ConstraintViolation<CreatePatientRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("dateOfBirth");
    }

    @Test
    @DisplayName("CreatePatientRequest with invalid email fails validation")
    void testCreatePatientRequestInvalidEmailFails() {
        CreatePatientRequest request = new CreatePatientRequest(
                "PAT-003",
                "Diana",
                "Prince",
                LocalDate.of(1985, 1, 1),
                Gender.FEMALE,
                "+1-555-7777"
        );
        request.setEmail("not-a-valid-email");

        Set<ConstraintViolation<CreatePatientRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("email");
    }

    @Test
    @DisplayName("UpdatePatientRequest with valid fields passes validation")
    void testUpdatePatientRequestValid() {
        UpdatePatientRequest request = new UpdatePatientRequest(
                "Barry",
                "Allen",
                LocalDate.of(1992, 3, 14),
                Gender.MALE,
                "+1-555-6666"
        );
        request.setEmail("barry.allen@ccpd.gov");

        Set<ConstraintViolation<UpdatePatientRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("UpdatePatientRequest with missing required fields fails validation")
    void testUpdatePatientRequestMissingRequired() {
        UpdatePatientRequest request = new UpdatePatientRequest();

        Set<ConstraintViolation<UpdatePatientRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("firstName", "lastName", "dateOfBirth", "gender", "phone");
    }

    @Test
    @DisplayName("UpdatePatientStatusRequest with valid active flag passes")
    void testUpdatePatientStatusRequestValid() {
        UpdatePatientStatusRequest request = new UpdatePatientStatusRequest(false, "Patient relocated");

        Set<ConstraintViolation<UpdatePatientStatusRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("UpdatePatientStatusRequest with null active flag fails")
    void testUpdatePatientStatusRequestNullActiveFails() {
        UpdatePatientStatusRequest request = new UpdatePatientStatusRequest();

        Set<ConstraintViolation<UpdatePatientStatusRequest>> violations = validator.validate(request);
        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("active");
    }

    @Test
    @DisplayName("PatientResponse maps all entity fields correctly and handles null safely")
    void testPatientResponseMapping() {
        assertThat(PatientResponse.fromEntity(null)).isNull();

        Patient patient = new Patient("PAT-001", "Arthur", "Curry", LocalDate.of(1986, 1, 29), Gender.MALE, "+1-555-5555");
        patient.setId(10L);
        patient.setUserId(20L);
        patient.setEmail("arthur@atlantis.org");
        patient.setAllergies("None");
        patient.setMedicalConditions("None");

        PatientResponse response = PatientResponse.fromEntity(patient);
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.patientCode()).isEqualTo("PAT-001");
        assertThat(response.firstName()).isEqualTo("Arthur");
        assertThat(response.lastName()).isEqualTo("Curry");
        assertThat(response.dateOfBirth()).isEqualTo(LocalDate.of(1986, 1, 29));
        assertThat(response.gender()).isEqualTo(Gender.MALE);
        assertThat(response.email()).isEqualTo("arthur@atlantis.org");
        assertThat(response.phone()).isEqualTo("+1-555-5555");
        assertThat(response.allergies()).isEqualTo("None");
        assertThat(response.medicalConditions()).isEqualTo("None");
        assertThat(response.active()).isTrue();
    }

    @Test
    @DisplayName("PatientSummaryResponse maps lightweight fields correctly and handles null safely")
    void testPatientSummaryResponseMapping() {
        assertThat(PatientSummaryResponse.fromEntity(null)).isNull();

        Patient patient = new Patient("PAT-002", "Victor", "Stone", LocalDate.of(1994, 6, 20), Gender.MALE, "+1-555-4444");
        patient.setId(11L);
        patient.setUserId(21L);
        patient.setEmail("victor@star-labs.org");
        patient.setCity("Detroit");

        PatientSummaryResponse summary = PatientSummaryResponse.fromEntity(patient);
        assertThat(summary).isNotNull();
        assertThat(summary.id()).isEqualTo(11L);
        assertThat(summary.patientCode()).isEqualTo("PAT-002");
        assertThat(summary.firstName()).isEqualTo("Victor");
        assertThat(summary.lastName()).isEqualTo("Stone");
        assertThat(summary.dateOfBirth()).isEqualTo(LocalDate.of(1994, 6, 20));
        assertThat(summary.gender()).isEqualTo(Gender.MALE);
        assertThat(summary.email()).isEqualTo("victor@star-labs.org");
        assertThat(summary.phone()).isEqualTo("+1-555-4444");
        assertThat(summary.city()).isEqualTo("Detroit");
        assertThat(summary.active()).isTrue();
    }

    @Test
    void profileContractsDoNotExposeAccountOwnership() {
        ObjectMapper mapper = new ObjectMapper();
        for (Class<?> type : new Class<?>[]{CreatePatientRequest.class, UpdatePatientRequest.class,
                UpdatePatientStatusRequest.class, PatientResponse.class, PatientSummaryResponse.class}) {
            assertThat(mapper.getDeserializationConfig().introspect(mapper.constructType(type)).findProperties())
                    .extracting(property -> property.getName())
                    .doesNotContain("userId", "user", "password", "passwordHash", "role", "version");
            assertThat(mapper.getSerializationConfig().introspect(mapper.constructType(type)).findProperties())
                    .extracting(property -> property.getName())
                    .doesNotContain("userId", "user", "password", "passwordHash", "role", "version");
        }
        assertThat(mapper.getDeserializationConfig().introspect(mapper.constructType(UpdatePatientRequest.class)).findProperties())
                .extracting(property -> property.getName()).doesNotContain("patientCode", "active");
    }

    @ParameterizedTest
    @CsvSource({"firstName,60", "lastName,60", "email,150", "phone,25", "addressLine1,150",
            "addressLine2,150", "city,100", "emergencyContactName,120", "emergencyContactPhone,25",
            "emergencyContactRelationship,50"})
    void profileFieldLengthsMatchSchema(String field, int limit) {
        for (Object request : new Object[]{new CreatePatientRequest(), new UpdatePatientRequest()}) {
            BeanWrapperImpl bean = new BeanWrapperImpl(request);
            String value = field.equals("email") ? "a@" + "b".repeat(60) + "." + "c".repeat(60)
                    + "." + "d".repeat(22) + ".com" : "x".repeat(limit);
            assertThat(value).hasSize(limit);
            bean.setPropertyValue(field, value);
            assertThat(validator.validateProperty(request, field)).isEmpty();
            bean.setPropertyValue(field, "x" + value);
            assertThat(validator.validateProperty(request, field)).isNotEmpty();
        }
    }

    @Test
    void patientCodeMustBeProvidedAndFitSchema() {
        CreatePatientRequest request = new CreatePatientRequest();
        for (String code : new String[]{null, "", "   ", "x".repeat(31)}) {
            request.setPatientCode(code);
            assertThat(validator.validateProperty(request, "patientCode")).isNotEmpty();
        }
        request.setPatientCode("x".repeat(30));
        assertThat(validator.validateProperty(request, "patientCode")).isEmpty();
    }

    @Test
    void updateRejectsFutureDobInvalidEmailAndBlankRequiredText() {
        UpdatePatientRequest request = new UpdatePatientRequest(" ", " ", LocalDate.now().plusDays(1), Gender.OTHER, " ");
        request.setEmail("invalid-email");
        assertThat(validator.validate(request)).extracting(v -> v.getPropertyPath().toString())
                .containsExactlyInAnyOrder("firstName", "lastName", "phone", "email", "dateOfBirth");
    }

    @Test
    void dobTodayAndOptionalEmailAreAccepted() {
        CreatePatientRequest create = new CreatePatientRequest("PAT-TODAY", "A", "B", LocalDate.now(), Gender.OTHER, "123");
        UpdatePatientRequest update = new UpdatePatientRequest("A", "B", LocalDate.now(), Gender.OTHER, "123");
        assertThat(validator.validate(create)).isEmpty();
        assertThat(validator.validate(update)).isEmpty();
    }

    @Test
    void statusReasonLengthMatchesSchemaWithoutInventingRequiredReasonRule() {
        UpdatePatientStatusRequest request = new UpdatePatientStatusRequest(false);
        assertThat(validator.validate(request)).isEmpty();
        request.setDeactivationReason("x".repeat(255));
        assertThat(validator.validate(request)).isEmpty();
        request.setDeactivationReason("x".repeat(256));
        assertThat(validator.validate(request)).extracting(v -> v.getPropertyPath().toString())
                .containsExactly("deactivationReason");
    }

    @Test
    void detailResponseMapsContactHistoryAndLifecycleFields() {
        Patient patient = new Patient("PAT-DETAIL", "A", "B", LocalDate.of(1990, 1, 1), Gender.OTHER, "123");
        patient.setAddressLine1("Line 1");
        patient.setAddressLine2("Line 2");
        patient.setCity("Colombo");
        patient.setEmergencyContactName("Contact");
        patient.setEmergencyContactPhone("456");
        patient.setEmergencyContactRelationship("Sibling");
        patient.setCurrentMedications("Medication");
        patient.setDentalHistory("History");
        patient.setNotes("Note");
        patient.setActive(false);
        patient.setDeactivationReason("Archived");
        LocalDateTime created = LocalDateTime.of(2026, 1, 1, 10, 0);
        patient.setCreatedAt(created);
        patient.setUpdatedAt(created.plusDays(1));
        patient.setDeactivatedAt(created.plusDays(1));
        PatientResponse response = PatientResponse.fromEntity(patient);
        assertThat(response.addressLine1()).isEqualTo("Line 1");
        assertThat(response.addressLine2()).isEqualTo("Line 2");
        assertThat(response.city()).isEqualTo("Colombo");
        assertThat(response.emergencyContactName()).isEqualTo("Contact");
        assertThat(response.emergencyContactPhone()).isEqualTo("456");
        assertThat(response.emergencyContactRelationship()).isEqualTo("Sibling");
        assertThat(response.currentMedications()).isEqualTo("Medication");
        assertThat(response.dentalHistory()).isEqualTo("History");
        assertThat(response.notes()).isEqualTo("Note");
        assertThat(response.active()).isFalse();
        assertThat(response.deactivationReason()).isEqualTo("Archived");
        assertThat(response.createdAt()).isEqualTo(created);
        assertThat(response.updatedAt()).isEqualTo(created.plusDays(1));
        assertThat(response.deactivatedAt()).isEqualTo(created.plusDays(1));
        assertThat(PatientSummaryResponse.fromEntity(patient).createdAt()).isEqualTo(created);
        assertThat(PatientSummaryResponse.fromEntity(patient).active()).isFalse();
    }
}
