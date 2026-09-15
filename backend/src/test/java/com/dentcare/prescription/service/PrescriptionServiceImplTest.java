package com.dentcare.prescription.service;

import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.PrescriptionItemRequest;
import com.dentcare.prescription.dto.PrescriptionResponse;
import com.dentcare.prescription.dto.UpdatePrescriptionRequest;
import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionItem;
import com.dentcare.prescription.entity.PrescriptionStatus;
import com.dentcare.prescription.exception.InvalidPrescriptionUserRoleException;
import com.dentcare.prescription.exception.PrescriptionNotFoundException;
import com.dentcare.prescription.exception.PrescriptionStateException;
import com.dentcare.prescription.repository.PrescriptionRepository;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrescriptionServiceImplTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PrescriptionServiceImpl prescriptionService;

    private User patient;
    private User dentist;
    private User nonPatient;

    @BeforeEach
    void setUp() {
        patient = new User();
        patient.setId(1L);
        patient.setFirstName("Alice");
        patient.setLastName("Patient");
        patient.setEmail("alice@example.com");
        patient.setPasswordHash("$2a$hash");
        patient.setRole(Role.PATIENT);
        patient.setActive(true);

        dentist = new User();
        dentist.setId(2L);
        dentist.setFirstName("Dr Bob");
        dentist.setLastName("Dentist");
        dentist.setEmail("bob@clinic.com");
        dentist.setPasswordHash("$2a$hash");
        dentist.setRole(Role.DENTIST);
        dentist.setActive(true);

        nonPatient = new User();
        nonPatient.setId(3L);
        nonPatient.setFirstName("Carol");
        nonPatient.setLastName("Receptionist");
        nonPatient.setEmail("carol@clinic.com");
        nonPatient.setPasswordHash("$2a$hash");
        nonPatient.setRole(Role.RECEPTIONIST);
        nonPatient.setActive(true);
    }

    private PrescriptionItemRequest buildItemRequest() {
        PrescriptionItemRequest req = new PrescriptionItemRequest();
        req.setMedicineName("Amoxicillin");
        req.setStrength("500mg");
        req.setDosage("1 tablet");
        req.setFrequency("3 times daily");
        req.setDuration("7 days");
        req.setQuantity(21);
        req.setInstructions("Take after meals");
        return req;
    }

    private Prescription buildSavedDraftPrescription() {
        Prescription p = new Prescription(patient, dentist);
        p.setId(10L);
        p.setStatus(PrescriptionStatus.DRAFT);
        p.setItems(new ArrayList<>());
        return p;
    }

    // ------ createPrescription ------

    @Test
    @DisplayName("createPrescription: valid patient and dentist creates DRAFT with no items")
    void createPrescription_validUsers_createsDraft() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(dentist));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> {
            Prescription p = inv.getArgument(0);
            p.setId(10L);
            return p;
        });

        CreatePrescriptionRequest request = new CreatePrescriptionRequest();
        request.setPatientId(1L);
        request.setDentistId(2L);
        request.setNotes("Some notes");

        PrescriptionResponse response = prescriptionService.createPrescription(request);

        assertNotNull(response);
        assertEquals(10L, response.id());
        assertEquals(PrescriptionStatus.DRAFT, response.status());
        assertEquals(1L, response.patientId());
        assertEquals(2L, response.dentistId());
        assertEquals("Some notes", response.notes());
        assertTrue(response.items().isEmpty());
        verify(prescriptionRepository).save(any(Prescription.class));
    }

    @Test
    @DisplayName("createPrescription: invalid patient id (wrong role) throws InvalidPrescriptionUserRoleException")
    void createPrescription_nonPatientUser_throwsInvalidRoleException() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(nonPatient));

        CreatePrescriptionRequest request = new CreatePrescriptionRequest();
        request.setPatientId(3L);
        request.setDentistId(2L);

        assertThrows(InvalidPrescriptionUserRoleException.class,
                () -> prescriptionService.createPrescription(request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("createPrescription: non-existent patient throws InvalidPrescriptionUserRoleException")
    void createPrescription_patientNotFound_throwsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        CreatePrescriptionRequest request = new CreatePrescriptionRequest();
        request.setPatientId(99L);
        request.setDentistId(2L);

        assertThrows(InvalidPrescriptionUserRoleException.class,
                () -> prescriptionService.createPrescription(request));
    }

    @Test
    @DisplayName("createPrescription: invalid dentist role throws InvalidPrescriptionUserRoleException")
    void createPrescription_nonDentistDentist_throwsInvalidRoleException() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(3L)).thenReturn(Optional.of(nonPatient));

        CreatePrescriptionRequest request = new CreatePrescriptionRequest();
        request.setPatientId(1L);
        request.setDentistId(3L);

        assertThrows(InvalidPrescriptionUserRoleException.class,
                () -> prescriptionService.createPrescription(request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("createPrescription: items provided are saved with prescription")
    void createPrescription_withItems_savesItems() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(userRepository.findById(2L)).thenReturn(Optional.of(dentist));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> {
            Prescription p = inv.getArgument(0);
            p.setId(10L);
            return p;
        });

        CreatePrescriptionRequest request = new CreatePrescriptionRequest();
        request.setPatientId(1L);
        request.setDentistId(2L);
        request.setItems(List.of(buildItemRequest()));

        PrescriptionResponse response = prescriptionService.createPrescription(request);

        assertEquals(1, response.items().size());
        assertEquals("Amoxicillin", response.items().get(0).medicineName());
        assertEquals(21, response.items().get(0).quantity());
    }

    // ------ getPrescriptionById ------

    @Test
    @DisplayName("getPrescriptionById: not found throws PrescriptionNotFoundException")
    void getPrescriptionById_notFound_throwsException() {
        when(prescriptionRepository.findByIdWithItems(99L)).thenReturn(Optional.empty());
        assertThrows(PrescriptionNotFoundException.class, () -> prescriptionService.getPrescriptionById(99L));
    }

    // ------ updatePrescription ------

    @Test
    @DisplayName("updatePrescription: DRAFT prescription can be updated with new notes and items")
    void updatePrescription_draft_updatesSuccessfully() {
        Prescription draft = buildSavedDraftPrescription();
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(draft));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdatePrescriptionRequest request = new UpdatePrescriptionRequest();
        request.setNotes("Updated notes");
        request.setItems(List.of(buildItemRequest()));

        PrescriptionResponse response = prescriptionService.updatePrescription(10L, request);

        assertEquals("Updated notes", response.notes());
        assertEquals(1, response.items().size());
    }

    @Test
    @DisplayName("updatePrescription: FINALIZED prescription throws PrescriptionStateException")
    void updatePrescription_finalized_throwsStateException() {
        Prescription finalized = buildSavedDraftPrescription();
        finalized.setStatus(PrescriptionStatus.FINALIZED);
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(finalized));

        UpdatePrescriptionRequest request = new UpdatePrescriptionRequest();
        request.setNotes("Trying to edit");

        assertThrows(PrescriptionStateException.class,
                () -> prescriptionService.updatePrescription(10L, request));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePrescription: CANCELLED prescription throws PrescriptionStateException")
    void updatePrescription_cancelled_throwsStateException() {
        Prescription cancelled = buildSavedDraftPrescription();
        cancelled.setStatus(PrescriptionStatus.CANCELLED);
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(cancelled));

        UpdatePrescriptionRequest request = new UpdatePrescriptionRequest();
        assertThrows(PrescriptionStateException.class,
                () -> prescriptionService.updatePrescription(10L, request));
    }

    // ------ finalizePrescription ------

    @Test
    @DisplayName("finalizePrescription: DRAFT with items finalizes successfully")
    void finalizePrescription_draftWithItems_finalizesSuccessfully() {
        Prescription draft = buildSavedDraftPrescription();
        PrescriptionItem item = new PrescriptionItem("Amoxicillin", "1 tablet", "3x daily", "7 days", 21);
        item.setPrescription(draft);
        draft.getItems().add(item);

        when(userRepository.findById(2L)).thenReturn(Optional.of(dentist));
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(draft));
        when(prescriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PrescriptionResponse response = prescriptionService.finalizePrescription(10L, 2L);

        assertEquals(PrescriptionStatus.FINALIZED, response.status());
        assertNotNull(response.finalizedAt());
    }

    @Test
    @DisplayName("finalizePrescription: DRAFT with no items throws PrescriptionStateException")
    void finalizePrescription_noItems_throwsStateException() {
        Prescription draft = buildSavedDraftPrescription();
        when(userRepository.findById(2L)).thenReturn(Optional.of(dentist));
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(draft));

        assertThrows(PrescriptionStateException.class,
                () -> prescriptionService.finalizePrescription(10L, 2L));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("finalizePrescription: non-DENTIST user throws InvalidPrescriptionUserRoleException")
    void finalizePrescription_nonDentist_throwsInvalidRoleException() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(nonPatient));

        assertThrows(InvalidPrescriptionUserRoleException.class,
                () -> prescriptionService.finalizePrescription(10L, 3L));
        verify(prescriptionRepository, never()).findByIdWithItems(any());
    }

    @Test
    @DisplayName("finalizePrescription: already FINALIZED prescription throws PrescriptionStateException")
    void finalizePrescription_alreadyFinalized_throwsStateException() {
        Prescription finalized = buildSavedDraftPrescription();
        finalized.setStatus(PrescriptionStatus.FINALIZED);
        when(userRepository.findById(2L)).thenReturn(Optional.of(dentist));
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(finalized));

        assertThrows(PrescriptionStateException.class,
                () -> prescriptionService.finalizePrescription(10L, 2L));
    }

    // ------ cancelPrescription ------

    @Test
    @DisplayName("cancelPrescription: DRAFT prescription transitions to CANCELLED")
    void cancelPrescription_draft_cancelledSuccessfully() {
        Prescription draft = buildSavedDraftPrescription();
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(draft));
        when(prescriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PrescriptionResponse response = prescriptionService.cancelPrescription(10L);

        assertEquals(PrescriptionStatus.CANCELLED, response.status());
        verify(prescriptionRepository).save(any());
    }

    @Test
    @DisplayName("cancelPrescription: FINALIZED prescription can be cancelled non-destructively")
    void cancelPrescription_finalized_cancelledNonDestructively() {
        Prescription finalized = buildSavedDraftPrescription();
        finalized.setStatus(PrescriptionStatus.FINALIZED);
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(finalized));
        when(prescriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PrescriptionResponse response = prescriptionService.cancelPrescription(10L);

        assertEquals(PrescriptionStatus.CANCELLED, response.status());
    }

    @Test
    @DisplayName("cancelPrescription: already CANCELLED throws PrescriptionStateException")
    void cancelPrescription_alreadyCancelled_throwsStateException() {
        Prescription cancelled = buildSavedDraftPrescription();
        cancelled.setStatus(PrescriptionStatus.CANCELLED);
        when(prescriptionRepository.findByIdWithItems(10L)).thenReturn(Optional.of(cancelled));

        assertThrows(PrescriptionStateException.class,
                () -> prescriptionService.cancelPrescription(10L));
        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("cancelPrescription: not found throws PrescriptionNotFoundException")
    void cancelPrescription_notFound_throwsException() {
        when(prescriptionRepository.findByIdWithItems(99L)).thenReturn(Optional.empty());
        assertThrows(PrescriptionNotFoundException.class,
                () -> prescriptionService.cancelPrescription(99L));
    }
}
