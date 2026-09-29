package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.ClinicalExaminationResponse;
import com.dentcare.clinical.dto.ConfirmDiagnosisRequest;
import com.dentcare.clinical.dto.CreateClinicalExaminationRequest;
import com.dentcare.clinical.dto.UpdateClinicalExaminationRequest;
import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.DentistNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidDiagnosisConfirmationException;
import com.dentcare.clinical.exception.PatientMismatchException;
import com.dentcare.clinical.exception.PatientNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.clinical.integration.PatientLookupPort;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.clinical.security.CurrentDentistProvider;
import com.dentcare.clinical.security.Dentist;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Implementation of {@link ClinicalExaminationService} enforcing examination lifecycle,
 * patient/dentist verification, patient ownership isolation, and dentist-only clinical actions.
 */
@Service
@Transactional(readOnly = true)
public class ClinicalExaminationServiceImpl implements ClinicalExaminationService {

    private final ClinicalExaminationRepository examinationRepository;
    private final PatientLookupPort patientLookupPort;
    private final DentistLookupPort dentistLookupPort;
    private final CurrentDentistProvider currentDentistProvider;

    @Autowired
    public ClinicalExaminationServiceImpl(ClinicalExaminationRepository examinationRepository,

                                          PatientLookupPort patientLookupPort,
                                          DentistLookupPort dentistLookupPort,
                                          CurrentDentistProvider currentDentistProvider) {
        this.examinationRepository = examinationRepository;
        this.patientLookupPort = patientLookupPort;
        this.dentistLookupPort = dentistLookupPort;
        this.currentDentistProvider = currentDentistProvider;
    }

    public ClinicalExaminationServiceImpl(ClinicalExaminationRepository examinationRepository,
                                          PatientLookupPort patientLookupPort,
                                          DentistLookupPort dentistLookupPort) {
        this(examinationRepository, patientLookupPort, dentistLookupPort, null);
    }

    @Override
    @Transactional
    public ClinicalExaminationResponse createDraftExamination(CreateClinicalExaminationRequest request) {
        if (!patientLookupPort.existsActivePatient(request.patientId())) {
            throw new PatientNotFoundException(request.patientId());
        }

        if (!dentistLookupPort.existsActiveDentist(request.dentistId())) {
            throw new DentistNotFoundException(request.dentistId());
        }

        if (request.chiefComplaint() == null || request.chiefComplaint().trim().isEmpty()) {
            throw new IllegalArgumentException("Chief complaint is required");
        }

        LocalDate examDate = request.examinationDate() != null ? request.examinationDate() : LocalDate.now();

        ClinicalExamination examination = new ClinicalExamination(
                request.patientId(),
                request.dentistId(),
                request.recordedByUserId(),
                examDate,
                request.chiefComplaint().trim()
        );

        examination.setAppointmentId(request.appointmentId());
        examination.setClinicalObservations(trimToNull(request.clinicalObservations()));
        examination.setProvisionalDiagnosis(trimToNull(request.provisionalDiagnosis()));
        examination.setFollowUpDate(request.followUpDate());
        examination.setFollowUpNotes(trimToNull(request.followUpNotes()));
        examination.setStatus(ExaminationStatus.DRAFT);
        examination.setDiagnosisConfirmed(false);

        ClinicalExamination saved = examinationRepository.save(examination);
        return ClinicalExaminationResponse.fromEntity(saved);
    }

    @Override
    public ClinicalExaminationResponse getExaminationById(Long id) {
        ClinicalExamination examination = examinationRepository.findById(id)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(id));
        return ClinicalExaminationResponse.fromEntity(examination);
    }

    @Override
    public ClinicalExaminationResponse getExaminationByIdAndPatientId(Long id, Long patientId) {
        ClinicalExamination examination = examinationRepository.findById(id)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(id));

        if (!examination.getPatientId().equals(patientId)) {
            throw new PatientMismatchException(id, patientId);
        }

        return ClinicalExaminationResponse.fromEntity(examination);
    }

    @Override
    public List<ClinicalExaminationResponse> getExaminationsByPatientId(Long patientId) {
        return examinationRepository.findByPatientIdOrderByExaminationDateDescIdDesc(patientId)
                .stream()
                .map(ClinicalExaminationResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ClinicalExaminationResponse> getExaminationsByDentistId(Long dentistId) {
        return examinationRepository.findByDentistIdOrderByExaminationDateDescIdDesc(dentistId)
                .stream()
                .map(ClinicalExaminationResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public ClinicalExaminationResponse updateDraftExamination(Long id, UpdateClinicalExaminationRequest request) {
        return updateDraftExamination(id, null, request);
    }

    @Override
    @Transactional
    public ClinicalExaminationResponse updateDraftExamination(Long id, Long patientId, UpdateClinicalExaminationRequest request) {
        ClinicalExamination examination = examinationRepository.findById(id)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(id));

        if (patientId != null && !examination.getPatientId().equals(patientId)) {
            throw new PatientMismatchException(id, patientId);
        }

        if (examination.getStatus() != ExaminationStatus.DRAFT) {
            throw new InvalidClinicalExaminationStateException(
                    "Cannot modify an examination that has status: " + examination.getStatus()
            );
        }

        if (request.examinationDate() != null) {
            examination.setExaminationDate(request.examinationDate());
        }
        if (request.chiefComplaint() != null) {
            if (request.chiefComplaint().trim().isEmpty()) {
                throw new IllegalArgumentException("Chief complaint cannot be empty");
            }
            examination.setChiefComplaint(request.chiefComplaint().trim());
        }
        if (request.clinicalObservations() != null) {
            examination.setClinicalObservations(trimToNull(request.clinicalObservations()));
        }
        if (request.provisionalDiagnosis() != null) {
            examination.setProvisionalDiagnosis(trimToNull(request.provisionalDiagnosis()));
        }
        if (request.followUpDate() != null) {
            examination.setFollowUpDate(request.followUpDate());
        }
        if (request.followUpNotes() != null) {
            examination.setFollowUpNotes(trimToNull(request.followUpNotes()));
        }

        ClinicalExamination updated = examinationRepository.save(examination);
        return ClinicalExaminationResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public ClinicalExaminationResponse completeExamination(Long id) {
        if (currentDentistProvider != null) {
            currentDentistProvider.getCurrentDentist();
        }
        ClinicalExamination examination = examinationRepository.findById(id)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(id));

        if (examination.getStatus() == ExaminationStatus.COMPLETED) {
            return ClinicalExaminationResponse.fromEntity(examination);
        }

        if (examination.getStatus() == ExaminationStatus.CANCELLED) {
            throw new InvalidClinicalExaminationStateException("Cannot complete a cancelled examination");
        }

        if (examination.getChiefComplaint() == null || examination.getChiefComplaint().trim().isEmpty()) {
            throw new InvalidClinicalExaminationStateException("Cannot complete examination without a chief complaint");
        }

        examination.setStatus(ExaminationStatus.COMPLETED);
        ClinicalExamination saved = examinationRepository.save(examination);
        return ClinicalExaminationResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public ClinicalExaminationResponse cancelExamination(Long id) {
        if (currentDentistProvider != null) {
            currentDentistProvider.getCurrentDentist();
        }
        ClinicalExamination examination = examinationRepository.findById(id)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(id));

        if (examination.getStatus() == ExaminationStatus.COMPLETED) {
            throw new InvalidClinicalExaminationStateException(
                    "Cannot cancel a completed examination; clinical history must be preserved"
            );
        }

        if (examination.getStatus() == ExaminationStatus.CANCELLED) {
            throw new InvalidClinicalExaminationStateException("Examination is already cancelled");
        }

        examination.setStatus(ExaminationStatus.CANCELLED);
        ClinicalExamination saved = examinationRepository.save(examination);
        return ClinicalExaminationResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public ClinicalExaminationResponse confirmDiagnosis(Long id, ConfirmDiagnosisRequest request) {
        ClinicalExamination examination = examinationRepository.findById(id)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(id));

        if (examination.getStatus() == ExaminationStatus.CANCELLED) {
            throw new InvalidClinicalExaminationStateException(
                    "Cannot confirm diagnosis for a cancelled examination"
            );
        }

        if (examination.isDiagnosisConfirmed()) {
            throw new InvalidDiagnosisConfirmationException(
                    "Diagnosis has already been confirmed and cannot be overwritten"
            );
        }

        if (request.confirmedDiagnosis() == null || request.confirmedDiagnosis().trim().isEmpty()) {
            throw new InvalidDiagnosisConfirmationException("Confirmed diagnosis cannot be blank");
        }

        Dentist actingDentist = currentDentistProvider != null
                ? currentDentistProvider.getCurrentDentist()
                : null;
        if (actingDentist == null) {
            throw new UnauthorizedClinicalOperationException("No authenticated dentist authorized to confirm diagnosis");
        }

        examination.setConfirmedDiagnosis(request.confirmedDiagnosis().trim());
        examination.setDiagnosisConfirmed(true);
        examination.setConfirmedByDentistId(actingDentist.id());
        examination.setDiagnosisConfirmedAt(LocalDateTime.now());

        ClinicalExamination saved = examinationRepository.save(examination);
        return ClinicalExaminationResponse.fromEntity(saved);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
