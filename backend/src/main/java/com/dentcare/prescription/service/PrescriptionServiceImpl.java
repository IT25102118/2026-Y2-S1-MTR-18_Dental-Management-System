package com.dentcare.prescription.service;

import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.PrescriptionItemRequest;
import com.dentcare.prescription.dto.PrescriptionResponse;
import com.dentcare.prescription.dto.PrescriptionSummaryResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Implementation of {@link PrescriptionService} enforcing prescription lifecycle and integrity rules.
 */
@Service
@Transactional(readOnly = true)
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final UserRepository userRepository;

    public PrescriptionServiceImpl(PrescriptionRepository prescriptionRepository, UserRepository userRepository) {
        this.prescriptionRepository = prescriptionRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(CreatePrescriptionRequest request) {
        User patient = resolvePatient(request.getPatientId());
        User dentist = resolveDentist(request.getDentistId());

        Prescription prescription = new Prescription(patient, dentist);
        prescription.setNotes(trimmed(request.getNotes()));

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (PrescriptionItemRequest itemReq : request.getItems()) {
                prescription.addItem(buildItem(itemReq));
            }
        }

        Prescription saved = prescriptionRepository.save(prescription);
        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    public PrescriptionResponse getPrescriptionById(Long id) {
        Prescription prescription = prescriptionRepository.findByIdWithItems(id)
                .orElseThrow(() -> new PrescriptionNotFoundException(id));
        return PrescriptionResponse.fromEntity(prescription);
    }

    @Override
    public Page<PrescriptionSummaryResponse> getPrescriptionsByPatient(Long patientId, Pageable pageable) {
        // Validate patient exists and has the correct role
        resolvePatient(patientId);
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId, pageable)
                .map(PrescriptionSummaryResponse::fromEntity);
    }

    @Override
    public Page<PrescriptionSummaryResponse> getAllPrescriptions(Pageable pageable) {
        return prescriptionRepository.findAll(pageable)
                .map(PrescriptionSummaryResponse::fromEntity);
    }

    @Override
    @Transactional
    public PrescriptionResponse updatePrescription(Long id, UpdatePrescriptionRequest request) {
        Prescription prescription = prescriptionRepository.findByIdWithItems(id)
                .orElseThrow(() -> new PrescriptionNotFoundException(id));

        if (prescription.getStatus() != PrescriptionStatus.DRAFT) {
            throw new PrescriptionStateException(
                    "Prescription " + id + " cannot be edited because its status is " + prescription.getStatus() + ". Only DRAFT prescriptions may be updated.");
        }

        prescription.setNotes(trimmed(request.getNotes()));

        // Replace all items with the new set if provided; preserve existing items if null
        if (request.getItems() != null) {
            // Remove all existing items
            List<PrescriptionItem> existingItems = new ArrayList<>(prescription.getItems());
            for (PrescriptionItem item : existingItems) {
                prescription.removeItem(item);
            }
            // Add new items
            for (PrescriptionItemRequest itemReq : request.getItems()) {
                prescription.addItem(buildItem(itemReq));
            }
        }

        Prescription saved = prescriptionRepository.save(prescription);
        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public PrescriptionResponse finalizePrescription(Long id, Long finalizingDentistId) {
        // Validate the finalizing user is a DENTIST
        resolveDentist(finalizingDentistId);

        Prescription prescription = prescriptionRepository.findByIdWithItems(id)
                .orElseThrow(() -> new PrescriptionNotFoundException(id));

        if (prescription.getStatus() != PrescriptionStatus.DRAFT) {
            throw new PrescriptionStateException(
                    "Prescription " + id + " cannot be finalized because its status is " + prescription.getStatus() + ". Only DRAFT prescriptions may be finalized.");
        }

        if (prescription.getItems() == null || prescription.getItems().isEmpty()) {
            throw new PrescriptionStateException(
                    "Prescription " + id + " cannot be finalized because it has no medicine items. Add at least one item before finalizing.");
        }

        prescription.setStatus(PrescriptionStatus.FINALIZED);
        prescription.setFinalizedAt(LocalDateTime.now());

        Prescription saved = prescriptionRepository.save(prescription);
        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public PrescriptionResponse cancelPrescription(Long id) {
        Prescription prescription = prescriptionRepository.findByIdWithItems(id)
                .orElseThrow(() -> new PrescriptionNotFoundException(id));

        if (prescription.getStatus() == PrescriptionStatus.CANCELLED) {
            throw new PrescriptionStateException("Prescription " + id + " is already cancelled.");
        }

        prescription.setStatus(PrescriptionStatus.CANCELLED);

        Prescription saved = prescriptionRepository.save(prescription);
        return PrescriptionResponse.fromEntity(saved);
    }

    // --- Private helpers ---

    private User resolvePatient(Long patientId) {
        User user = userRepository.findById(patientId)
                .orElseThrow(() -> new InvalidPrescriptionUserRoleException("Patient not found with id: " + patientId));
        if (user.getRole() != Role.PATIENT) {
            throw new InvalidPrescriptionUserRoleException(
                    "User " + patientId + " is not a PATIENT. Only users with the PATIENT role may be linked as prescription patients.");
        }
        return user;
    }

    private User resolveDentist(Long dentistId) {
        User user = userRepository.findById(dentistId)
                .orElseThrow(() -> new InvalidPrescriptionUserRoleException("Dentist not found with id: " + dentistId));
        if (user.getRole() != Role.DENTIST) {
            throw new InvalidPrescriptionUserRoleException(
                    "User " + dentistId + " is not a DENTIST. Only users with the DENTIST role may author or finalize prescriptions.");
        }
        return user;
    }

    private PrescriptionItem buildItem(PrescriptionItemRequest req) {
        PrescriptionItem item = new PrescriptionItem();
        item.setMedicineName(req.getMedicineName() != null ? req.getMedicineName().trim() : null);
        item.setStrength(trimmed(req.getStrength()));
        item.setDosage(req.getDosage() != null ? req.getDosage().trim() : null);
        item.setFrequency(req.getFrequency() != null ? req.getFrequency().trim() : null);
        item.setDuration(req.getDuration() != null ? req.getDuration().trim() : null);
        item.setQuantity(req.getQuantity());
        item.setInstructions(trimmed(req.getInstructions()));
        return item;
    }

    private String trimmed(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
