package com.dentcare.prescription.service;

import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import com.dentcare.prescription.dto.CreatePrescriptionRequest;
import com.dentcare.prescription.dto.ExaminationPrescriptionContextResponse;
import com.dentcare.prescription.dto.PatientSafetyResponse;
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
import com.dentcare.prescription.state.PrescriptionStateFactory;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Implementation of PrescriptionService.
 *
 * MF-04 owns Prescription data.
 * Clinical Examination information is read only.
 */
@Service
@Transactional(readOnly = true)
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final ClinicalExaminationRepository clinicalExaminationRepository;

    /**
     * Main Spring constructor.
     */
    @Autowired
    public PrescriptionServiceImpl(
            PrescriptionRepository prescriptionRepository,
            UserRepository userRepository,
            PatientRepository patientRepository,
            ClinicalExaminationRepository clinicalExaminationRepository
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.clinicalExaminationRepository = clinicalExaminationRepository;
    }

    /**
     * Compatibility constructor for older unit tests.
     */
    public PrescriptionServiceImpl(
            PrescriptionRepository prescriptionRepository,
            UserRepository userRepository
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.userRepository = userRepository;
        this.patientRepository = null;
        this.clinicalExaminationRepository = null;
    }

    /**
     * Compatibility constructor for patient-safety tests.
     */
    public PrescriptionServiceImpl(
            PrescriptionRepository prescriptionRepository,
            UserRepository userRepository,
            PatientRepository patientRepository
    ) {
        this.prescriptionRepository = prescriptionRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.clinicalExaminationRepository = null;
    }

    @Override
    @Transactional
    public PrescriptionResponse createPrescription(
            CreatePrescriptionRequest request
    ) {

        User patient = resolvePatient(request.getPatientId());
        User dentist = resolveDentist(request.getDentistId());

        Prescription prescription =
                new Prescription(patient, dentist);

        prescription.setNotes(
                trimmed(request.getNotes())
        );

        /*
         * Examination is optional.
         *
         * When supplied, verify that the examination really belongs
         * to the same patient before saving its ID.
         */
        if (request.getExaminationId() != null) {
            validateAndAttachExamination(
                    prescription,
                    request.getExaminationId(),
                    patient
            );
        }

        if (request.getItems() != null
                && !request.getItems().isEmpty()) {

            for (PrescriptionItemRequest itemReq : request.getItems()) {
                prescription.addItem(
                        buildItem(itemReq)
                );
            }
        }

        Prescription saved =
                prescriptionRepository.save(prescription);

        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    public PrescriptionResponse getPrescriptionById(Long id) {

        Prescription prescription =
                prescriptionRepository
                        .findByIdWithItems(id)
                        .orElseThrow(
                                () -> new PrescriptionNotFoundException(id)
                        );

        return PrescriptionResponse.fromEntity(prescription);
    }

    @Override
    public Page<PrescriptionSummaryResponse>
    getPrescriptionsByPatient(
            Long patientId,
            Pageable pageable
    ) {

        resolvePatient(patientId);

        return prescriptionRepository
                .findByPatientIdOrderByCreatedAtDesc(
                        patientId,
                        pageable
                )
                .map(PrescriptionSummaryResponse::fromEntity);
    }

    @Override
    public Page<PrescriptionSummaryResponse>
    getAllPrescriptions(Pageable pageable) {

        return prescriptionRepository
                .findAll(pageable)
                .map(PrescriptionSummaryResponse::fromEntity);
    }

    @Override
    @Transactional
    public PrescriptionResponse updatePrescription(
            Long id,
            UpdatePrescriptionRequest request
    ) {

        Prescription prescription =
                prescriptionRepository
                        .findByIdWithItems(id)
                        .orElseThrow(
                                () -> new PrescriptionNotFoundException(id)
                        );

        PrescriptionStateFactory
                .from(prescription.getStatus())
                .validateCanEdit(id);

        prescription.setNotes(
                trimmed(request.getNotes())
        );

        if (request.getItems() != null) {

            List<PrescriptionItem> existingItems =
                    new ArrayList<>(
                            prescription.getItems()
                    );

            for (PrescriptionItem item : existingItems) {
                prescription.removeItem(item);
            }

            for (PrescriptionItemRequest itemReq : request.getItems()) {
                prescription.addItem(
                        buildItem(itemReq)
                );
            }
        }

        Prescription saved =
                prescriptionRepository.save(prescription);

        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public PrescriptionResponse finalizePrescription(
            Long id,
            Long finalizingDentistId
    ) {

        resolveDentist(finalizingDentistId);

        Prescription prescription =
                prescriptionRepository
                        .findByIdWithItems(id)
                        .orElseThrow(
                                () -> new PrescriptionNotFoundException(id)
                        );

        PrescriptionStateFactory
                .from(prescription.getStatus())
                .validateCanFinalize(id);

        if (prescription.getItems() == null
                || prescription.getItems().isEmpty()) {

            throw new PrescriptionStateException(
                    "Prescription "
                            + id
                            + " cannot be finalized because it has no medicine items. "
                            + "Add at least one item before finalizing."
            );
        }

        prescription.setStatus(
                PrescriptionStatus.FINALIZED
        );

        prescription.setFinalizedAt(
                LocalDateTime.now()
        );

        Prescription saved =
                prescriptionRepository.save(prescription);

        return PrescriptionResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public PrescriptionResponse cancelPrescription(Long id) {

        Prescription prescription =
                prescriptionRepository
                        .findByIdWithItems(id)
                        .orElseThrow(
                                () -> new PrescriptionNotFoundException(id)
                        );

        PrescriptionStateFactory
                .from(prescription.getStatus())
                .validateCanCancel(id);

        prescription.setStatus(
                PrescriptionStatus.CANCELLED
        );

        Prescription saved =
                prescriptionRepository.save(prescription);

        return PrescriptionResponse.fromEntity(saved);
    }

    /**
     * Allergy / patient-safety integration.
     */
    @Override
    public PatientSafetyResponse getPatientSafety(
            Long patientUserId
    ) {

        User user = resolvePatient(patientUserId);

        String patientName =
                (
                        user.getFirstName()
                                + " "
                                + user.getLastName()
                ).trim();

        if (patientRepository == null) {
            throw new IllegalStateException(
                    "Patient medical profile integration is unavailable."
            );
        }

        Patient patientRecord =
                patientRepository
                        .findByUserId(patientUserId)
                        .orElse(null);

        if (patientRecord == null) {
            return new PatientSafetyResponse(
                    patientUserId,
                    patientName,
                    null,
                    false,
                    false
            );
        }

        String allergies =
                trimmed(patientRecord.getAllergies());

        return new PatientSafetyResponse(
                patientUserId,
                patientName,
                allergies,
                true,
                allergies != null
        );
    }

    /**
     * Reads an examination from Clinical Management.
     *
     * Important:
     * Clinical stores patients.id.
     * Prescription stores users.id.
     *
     * Therefore:
     *
     * examination.patientId
     *       -> patients.id
     *       -> patients.userId
     *       -> users.id
     */
    @Override
    public ExaminationPrescriptionContextResponse
    getExaminationPrescriptionContext(
            Long examinationId
    ) {

        if (examinationId == null || examinationId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Examination ID must be a positive number."
            );
        }

        ensureClinicalIntegrationAvailable();

        ClinicalExamination examination =
                clinicalExaminationRepository
                        .findById(examinationId)
                        .orElseThrow(
                                () -> new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Clinical examination not found with id: "
                                                + examinationId
                                )
                        );

        Patient patientRecord =
                patientRepository
                        .findById(
                                examination.getPatientId()
                        )
                        .orElseThrow(
                                () -> new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Patient record linked to examination "
                                                + examinationId
                                                + " was not found."
                                )
                        );

        Long patientUserId =
                patientRecord.getUserId();

        if (patientUserId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Patient record "
                            + patientRecord.getId()
                            + " is not linked to a patient user account."
            );
        }

        User patientUser =
                resolvePatient(patientUserId);

        String patientName =
                (
                        patientUser.getFirstName()
                                + " "
                                + patientUser.getLastName()
                ).trim();

        String clinicalContext =
                firstNonBlank(
                        examination.getConfirmedDiagnosis(),
                        examination.getProvisionalDiagnosis(),
                        examination.getChiefComplaint()
                );

        return new ExaminationPrescriptionContextResponse(
                examination.getId(),
                patientRecord.getId(),
                patientUserId,
                patientName,
                examination.getExaminationDate(),
                examination.getStatus() != null
                        ? examination.getStatus().name()
                        : null,
                examination.isDiagnosisConfirmed(),
                clinicalContext
        );
    }

    /**
     * Ensures the supplied examination belongs to the
     * same patient selected for the prescription.
     */
    private void validateAndAttachExamination(
            Prescription prescription,
            Long examinationId,
            User prescriptionPatient
    ) {

        if (examinationId == null || examinationId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Examination ID must be a positive number."
            );
        }

        ensureClinicalIntegrationAvailable();

        ClinicalExamination examination =
                clinicalExaminationRepository
                        .findById(examinationId)
                        .orElseThrow(
                                () -> new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Clinical examination not found with id: "
                                                + examinationId
                                )
                        );

        Patient examinationPatient =
                patientRepository
                        .findById(
                                examination.getPatientId()
                        )
                        .orElseThrow(
                                () -> new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Patient record linked to examination "
                                                + examinationId
                                                + " was not found."
                                )
                        );

        Long examinationPatientUserId =
                examinationPatient.getUserId();

        if (examinationPatientUserId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The examination patient is not linked "
                            + "to a patient user account."
            );
        }

        if (!prescriptionPatient
                .getId()
                .equals(examinationPatientUserId)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Examination "
                            + examinationId
                            + " belongs to a different patient."
            );
        }

        prescription.setExaminationId(examinationId);
    }

    // ---------- Existing helpers ----------

    private User resolvePatient(Long patientId) {

        User user =
                userRepository
                        .findById(patientId)
                        .orElseThrow(
                                () ->
                                        new InvalidPrescriptionUserRoleException(
                                                "Patient not found with id: "
                                                        + patientId
                                        )
                        );

        if (user.getRole() != Role.PATIENT) {

            throw new InvalidPrescriptionUserRoleException(
                    "User "
                            + patientId
                            + " is not a PATIENT. "
                            + "Only users with the PATIENT role may be linked "
                            + "as prescription patients."
            );
        }

        return user;
    }

    private User resolveDentist(Long dentistId) {

        User user =
                userRepository
                        .findById(dentistId)
                        .orElseThrow(
                                () ->
                                        new InvalidPrescriptionUserRoleException(
                                                "Dentist not found with id: "
                                                        + dentistId
                                        )
                        );

        if (user.getRole() != Role.DENTIST) {

            throw new InvalidPrescriptionUserRoleException(
                    "User "
                            + dentistId
                            + " is not a DENTIST. "
                            + "Only users with the DENTIST role may author "
                            + "or finalize prescriptions."
            );
        }

        return user;
    }

    private PrescriptionItem buildItem(
            PrescriptionItemRequest req
    ) {

        PrescriptionItem item =
                new PrescriptionItem();

        item.setMedicineName(
                req.getMedicineName() != null
                        ? req.getMedicineName().trim()
                        : null
        );

        item.setStrength(
                trimmed(req.getStrength())
        );

        item.setDosage(
                req.getDosage() != null
                        ? req.getDosage().trim()
                        : null
        );

        item.setFrequency(
                req.getFrequency() != null
                        ? req.getFrequency().trim()
                        : null
        );

        item.setDuration(
                req.getDuration() != null
                        ? req.getDuration().trim()
                        : null
        );

        item.setQuantity(
                req.getQuantity()
        );

        item.setInstructions(
                trimmed(req.getInstructions())
        );

        return item;
    }

    private void ensureClinicalIntegrationAvailable() {

        if (clinicalExaminationRepository == null
                || patientRepository == null) {

            throw new IllegalStateException(
                    "Clinical Examination integration is unavailable."
            );
        }
    }

    private String firstNonBlank(
            String first,
            String second,
            String third
    ) {

        String value = trimmed(first);

        if (value != null) {
            return value;
        }

        value = trimmed(second);

        if (value != null) {
            return value;
        }

        return trimmed(third);
    }

    private String trimmed(String value) {

        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        return trimmed.isEmpty()
                ? null
                : trimmed;
    }
}