package com.dentcare.patient.service;

import com.dentcare.patient.dto.*;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.exception.DuplicatePatientCodeException;
import com.dentcare.patient.exception.PatientNotFoundException;
import com.dentcare.patient.repository.PatientRepository;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {
    private static ValidatorFactory factory;
    @Mock private PatientRepository repository;
    private PatientService service;
    private Patient patient;

    @BeforeAll
    static void openValidator() {
        factory = Validation.buildDefaultValidatorFactory();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @BeforeEach
    void setUp() {
        service = new PatientServiceImpl(repository, factory.getValidator());
        patient = new Patient("EXISTING", "First", "Last", LocalDate.of(1990, 1, 1), Gender.OTHER, "123");
        patient.setId(7L);
        patient.setUserId(19L);
        patient.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));
        patient.setVersion(3L);
        patient.setAllergies("Allergy history");
        patient.setDentalHistory("Dental history");
        patient.setNotes("Patient notes");
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void getReturnsDetailsForEitherStatus(boolean active) {
        patient.setActive(active);
        when(repository.findById(7L)).thenReturn(Optional.of(patient));
        PatientResponse response = service.getPatientById(7L);
        assertThat(response.id()).isEqualTo(7L);
        assertThat(response.active()).isEqualTo(active);
        assertThat(response.allergies()).isEqualTo("Allergy history");
        assertThat(response.dentalHistory()).isEqualTo("Dental history");
        assertThat(response.notes()).isEqualTo("Patient notes");
        verify(repository).findById(7L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void missingPatientUsesDomainExceptionForGetUpdateAndStatus() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getPatientById(99L)).isInstanceOf(PatientNotFoundException.class)
                .hasMessageContaining("99");
        assertThatThrownBy(() -> service.updatePatient(99L, updateRequest())).isInstanceOf(PatientNotFoundException.class);
        assertThatThrownBy(() -> service.updatePatientStatus(99L, new UpdatePatientStatusRequest(false)))
                .isInstanceOf(PatientNotFoundException.class);
        verify(repository, times(3)).findById(99L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void createUsesSuppliedCodeAndOnlyPatientFields() {
        CreatePatientRequest request = createRequest();
        request.setPatientCode("  CLINIC-42  ");
        request.setEmail("new@example.com");
        request.setAddressLine1("Address 1");
        request.setAddressLine2("Address 2");
        request.setCity("Colombo");
        request.setEmergencyContactName("Contact");
        request.setEmergencyContactPhone("456");
        request.setEmergencyContactRelationship("Sibling");
        request.setAllergies("Allergies");
        request.setMedicalConditions("Conditions");
        request.setCurrentMedications("Medications");
        request.setDentalHistory("History");
        request.setNotes("Notes");
        when(repository.saveAndFlush(any(Patient.class))).thenAnswer(invocation -> {
            Patient saved = invocation.getArgument(0);
            assertThat(saved.getUserId()).isNull();
            assertThat(saved.getDeactivatedAt()).isNull();
            assertThat(saved.getDeactivationReason()).isNull();
            saved.setId(42L);
            return saved;
        });
        PatientResponse response = service.createPatient(request);
        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.patientCode()).isEqualTo("CLINIC-42");
        assertThat(response.firstName()).isEqualTo("New");
        assertThat(response.lastName()).isEqualTo("Patient");
        assertThat(response.dateOfBirth()).isEqualTo(LocalDate.of(2000, 2, 3));
        assertThat(response.gender()).isEqualTo(Gender.FEMALE);
        assertThat(response.phone()).isEqualTo("123");
        assertThat(response.email()).isEqualTo("new@example.com");
        assertThat(response.addressLine1()).isEqualTo("Address 1");
        assertThat(response.addressLine2()).isEqualTo("Address 2");
        assertThat(response.city()).isEqualTo("Colombo");
        assertThat(response.emergencyContactName()).isEqualTo("Contact");
        assertThat(response.emergencyContactPhone()).isEqualTo("456");
        assertThat(response.emergencyContactRelationship()).isEqualTo("Sibling");
        assertThat(response.allergies()).isEqualTo("Allergies");
        assertThat(response.medicalConditions()).isEqualTo("Conditions");
        assertThat(response.currentMedications()).isEqualTo("Medications");
        assertThat(response.dentalHistory()).isEqualTo("History");
        assertThat(response.notes()).isEqualTo("Notes");
        assertThat(response.active()).isTrue();
        verify(repository).existsByPatientCode("CLINIC-42");
        verify(repository).saveAndFlush(any(Patient.class));
        verifyNoMoreInteractions(repository);
    }

    @Test
    void duplicateCodeIsRejectedWithoutInventingPersonMatching() {
        when(repository.existsByPatientCode("CLINIC-42")).thenReturn(true);
        assertThatThrownBy(() -> service.createPatient(createRequest())).isInstanceOf(DuplicatePatientCodeException.class);
        verify(repository).existsByPatientCode("CLINIC-42");
        verifyNoMoreInteractions(repository);
    }

    @Test
    void missingCodeIsRejectedInsteadOfGenerated() {
        CreatePatientRequest request = createRequest();
        request.setPatientCode(null);
        assertThatThrownBy(() -> service.createPatient(request)).isInstanceOf(ConstraintViolationException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void updateMapsPermittedFieldsAndPreservesOwnershipCodeAndLifecycle() {
        UpdatePatientRequest request = updateRequest();
        request.setEmail("updated@example.com");
        request.setAddressLine1("Address 1");
        request.setAddressLine2("Address 2");
        request.setCity("Kandy");
        request.setEmergencyContactName("New contact");
        request.setEmergencyContactPhone("789");
        request.setEmergencyContactRelationship("Parent");
        request.setAllergies("Updated allergies");
        request.setMedicalConditions("Updated conditions");
        request.setCurrentMedications("Updated medications");
        request.setDentalHistory("Updated history");
        request.setNotes("Updated notes");
        patient.setActive(false);
        LocalDateTime deactivated = LocalDateTime.of(2026, 2, 1, 10, 0);
        patient.setDeactivatedAt(deactivated);
        patient.setDeactivationReason("Archived");
        when(repository.findById(7L)).thenReturn(Optional.of(patient));
        when(repository.saveAndFlush(patient)).thenReturn(patient);

        PatientResponse response = service.updatePatient(7L, request);
        assertThat(response.firstName()).isEqualTo("Updated");
        assertThat(response.lastName()).isEqualTo("Name");
        assertThat(response.dateOfBirth()).isEqualTo(LocalDate.of(1995, 3, 4));
        assertThat(response.gender()).isEqualTo(Gender.MALE);
        assertThat(response.phone()).isEqualTo("456");
        assertThat(response.email()).isEqualTo("updated@example.com");
        assertThat(response.addressLine1()).isEqualTo("Address 1");
        assertThat(response.addressLine2()).isEqualTo("Address 2");
        assertThat(response.city()).isEqualTo("Kandy");
        assertThat(response.emergencyContactName()).isEqualTo("New contact");
        assertThat(response.emergencyContactPhone()).isEqualTo("789");
        assertThat(response.emergencyContactRelationship()).isEqualTo("Parent");
        assertThat(response.allergies()).isEqualTo("Updated allergies");
        assertThat(response.medicalConditions()).isEqualTo("Updated conditions");
        assertThat(response.currentMedications()).isEqualTo("Updated medications");
        assertThat(response.dentalHistory()).isEqualTo("Updated history");
        assertThat(response.notes()).isEqualTo("Updated notes");
        assertThat(patient.getUserId()).isEqualTo(19L);
        assertThat(response.patientCode()).isEqualTo("EXISTING");
        assertThat(response.id()).isEqualTo(7L);
        assertThat(patient.getVersion()).isEqualTo(3L);
        assertThat(response.createdAt()).isEqualTo(LocalDateTime.of(2026, 1, 1, 10, 0));
        assertThat(response.active()).isFalse();
        assertThat(response.deactivatedAt()).isEqualTo(deactivated);
        assertThat(response.deactivationReason()).isEqualTo("Archived");
        verify(repository).findById(7L);
        verify(repository).saveAndFlush(patient);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void optionalProfileValuesCanBeCleared() {
        when(repository.findById(7L)).thenReturn(Optional.of(patient));
        when(repository.saveAndFlush(patient)).thenReturn(patient);
        PatientResponse response = service.updatePatient(7L, updateRequest());
        assertThat(response.allergies()).isNull();
        assertThat(response.dentalHistory()).isNull();
        assertThat(response.notes()).isNull();
        assertThat(patient.getUserId()).isEqualTo(19L);
    }

    @Test
    void lifecyclePreservesRecordAndHistoryWithoutDeleteCalls() {
        when(repository.findById(7L)).thenReturn(Optional.of(patient));
        when(repository.saveAndFlush(patient)).thenReturn(patient);
        LocalDateTime before = LocalDateTime.now();
        PatientResponse inactive = service.updatePatientStatus(7L, new UpdatePatientStatusRequest(false, "Relocated"));
        assertThat(inactive.active()).isFalse();
        assertThat(inactive.deactivatedAt()).isBetween(before, LocalDateTime.now());
        assertThat(inactive.deactivationReason()).isEqualTo("Relocated");
        PatientResponse active = service.updatePatientStatus(7L, new UpdatePatientStatusRequest(true));
        assertThat(active.active()).isTrue();
        assertThat(active.deactivatedAt()).isEqualTo(inactive.deactivatedAt());
        assertThat(active.deactivationReason()).isEqualTo("Relocated");
        assertThat(active.id()).isEqualTo(7L);
        assertThat(active.allergies()).isEqualTo("Allergy history");
        assertThat(active.dentalHistory()).isEqualTo("Dental history");
        assertThat(active.notes()).isEqualTo("Patient notes");
        assertThat(patient.getUserId()).isEqualTo(19L);
        verify(repository, times(2)).findById(7L);
        verify(repository, times(2)).saveAndFlush(patient);
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void repeatedStatusIsNoOpPreservingMetadata(boolean active) {
        patient.setActive(active);
        patient.setDeactivationReason("Original reason");
        patient.setDeactivatedAt(LocalDateTime.of(2026, 2, 1, 10, 0));
        when(repository.findById(7L)).thenReturn(Optional.of(patient));
        PatientResponse response = service.updatePatientStatus(7L, new UpdatePatientStatusRequest(active, "Replacement"));
        assertThat(response.active()).isEqualTo(active);
        assertThat(response.deactivationReason()).isEqualTo("Original reason");
        assertThat(response.deactivatedAt()).isEqualTo(patient.getDeactivatedAt());
        verify(repository).findById(7L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void searchDelegatesSpecificationAndPageableAndMapsSummary() {
        PageRequest pageable = PageRequest.of(1, 2, Sort.by("lastName"));
        when(repository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(patient), pageable, 3));
        Page<PatientSummaryResponse> result = service.searchPatients("First", true, Gender.OTHER, pageable);
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getSize()).isEqualTo(2);
        assertThat(result.getTotalElements()).isEqualTo(3);
        assertThat(result.getContent()).extracting(PatientSummaryResponse::patientCode).containsExactly("EXISTING");
        verify(repository).findAll(any(Specification.class), eq(pageable));
        verifyNoMoreInteractions(repository);
    }

    @Test
    void emptySearchPageRemainsEmpty() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(repository.findAll(any(Specification.class), eq(pageable))).thenReturn(Page.empty(pageable));
        assertThat(service.searchPatients(null, null, null, pageable)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"dob", "email", "phone", "name"})
    void invalidProfileRequestsFailBeforeRepositoryAccess(String field) {
        CreatePatientRequest create = createRequest();
        UpdatePatientRequest update = updateRequest();
        switch (field) {
            case "dob" -> { create.setDateOfBirth(LocalDate.now().plusDays(1)); update.setDateOfBirth(LocalDate.now().plusDays(1)); }
            case "email" -> { create.setEmail("invalid"); update.setEmail("invalid"); }
            case "phone" -> { create.setPhone("x".repeat(26)); update.setPhone("x".repeat(26)); }
            case "name" -> { create.setFirstName(" "); update.setFirstName(" "); }
        }
        assertThatThrownBy(() -> service.createPatient(create)).isInstanceOf(ConstraintViolationException.class);
        assertThatThrownBy(() -> service.updatePatient(7L, update)).isInstanceOf(ConstraintViolationException.class);
        assertThat(patient.getFirstName()).isEqualTo("First");
        verifyNoInteractions(repository);
    }

    @Test
    void invalidStatusPayloadsFailBeforeMutation() {
        assertThatThrownBy(() -> service.updatePatientStatus(7L, new UpdatePatientStatusRequest()))
                .isInstanceOf(ConstraintViolationException.class);
        assertThatThrownBy(() -> service.updatePatientStatus(7L, new UpdatePatientStatusRequest(false, "x".repeat(256))))
                .isInstanceOf(ConstraintViolationException.class);
        assertThat(patient.isActive()).isTrue();
        verifyNoInteractions(repository);
    }

    @Test
    void nullArgumentsProduceConsistentInvalidArgumentErrors() {
        assertThatThrownBy(() -> service.createPatient(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.updatePatient(7L, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.updatePatientStatus(7L, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.getPatientById(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.searchPatients(null, null, null, null)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }

    private CreatePatientRequest createRequest() {
        return new CreatePatientRequest("CLINIC-42", "New", "Patient", LocalDate.of(2000, 2, 3), Gender.FEMALE, "123");
    }

    private UpdatePatientRequest updateRequest() {
        return new UpdatePatientRequest("Updated", "Name", LocalDate.of(1995, 3, 4), Gender.MALE, "456");
    }
}
