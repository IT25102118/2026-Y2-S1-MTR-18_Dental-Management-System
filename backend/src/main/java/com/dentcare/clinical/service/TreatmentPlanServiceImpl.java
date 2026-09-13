package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.ApproveTreatmentPlanRequest;
import com.dentcare.clinical.dto.CancelTreatmentPlanRequest;
import com.dentcare.clinical.dto.CreateTreatmentPlanRequest;
import com.dentcare.clinical.dto.FollowUpRequest;
import com.dentcare.clinical.dto.TreatmentPlanResponse;
import com.dentcare.clinical.dto.UpdateTreatmentPlanRequest;
import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ClinicalProgressNote;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import com.dentcare.clinical.entity.TreatmentProcedure;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.DentistNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidTreatmentPlanStateException;
import com.dentcare.clinical.exception.PatientMismatchException;
import com.dentcare.clinical.exception.PatientNotFoundException;
import com.dentcare.clinical.exception.TreatmentPlanNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.clinical.integration.PatientLookupPort;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.clinical.repository.ClinicalProgressNoteRepository;
import com.dentcare.clinical.repository.TreatmentPlanRepository;
import com.dentcare.clinical.repository.TreatmentProcedureRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Implementation of {@link TreatmentPlanService} enforcing patient/dentist validation,
 * examination tenant isolation, state transition invariants, procedure requirements,
 * and dentist-only authorizations.
 */
@Service
@Transactional(readOnly = true)
public class TreatmentPlanServiceImpl implements TreatmentPlanService {

    private final TreatmentPlanRepository treatmentPlanRepository;
    private final TreatmentProcedureRepository treatmentProcedureRepository;
    private final ClinicalExaminationRepository clinicalExaminationRepository;
    private final ClinicalProgressNoteRepository clinicalProgressNoteRepository;
    private final PatientLookupPort patientLookupPort;
    private final DentistLookupPort dentistLookupPort;

    public TreatmentPlanServiceImpl(TreatmentPlanRepository treatmentPlanRepository,
                                    TreatmentProcedureRepository treatmentProcedureRepository,
                                    ClinicalExaminationRepository clinicalExaminationRepository,
                                    ClinicalProgressNoteRepository clinicalProgressNoteRepository,
                                    PatientLookupPort patientLookupPort,
                                    DentistLookupPort dentistLookupPort) {
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.treatmentProcedureRepository = treatmentProcedureRepository;
        this.clinicalExaminationRepository = clinicalExaminationRepository;
        this.clinicalProgressNoteRepository = clinicalProgressNoteRepository;
        this.patientLookupPort = patientLookupPort;
        this.dentistLookupPort = dentistLookupPort;
    }

    @Override
    @Transactional
    public TreatmentPlanResponse createTreatmentPlan(CreateTreatmentPlanRequest request) {
        if (!patientLookupPort.existsActivePatient(request.patientId())) {
            throw new PatientNotFoundException(request.patientId());
        }

        if (!dentistLookupPort.existsActiveDentist(request.dentistId())) {
            throw new DentistNotFoundException(request.dentistId());
        }

        if (request.planName() == null || request.planName().trim().isEmpty()) {
            throw new IllegalArgumentException("Plan name is required");
        }

        if (request.planName().trim().length() > 150) {
            throw new IllegalArgumentException("Plan name cannot exceed 150 characters");
        }

        if (request.examinationId() != null) {
            ClinicalExamination examination = clinicalExaminationRepository.findById(request.examinationId())
                    .orElseThrow(() -> new ClinicalExaminationNotFoundException(request.examinationId()));

            if (!examination.getPatientId().equals(request.patientId())) {
                throw new PatientMismatchException(examination.getPatientId(), request.patientId());
            }

            if (examination.getStatus() == ExaminationStatus.CANCELLED) {
                throw new InvalidClinicalExaminationStateException("Cannot create treatment plan from a cancelled examination");
            }
        }

        BigDecimal estimatedCost = request.totalEstimatedCost() != null ? request.totalEstimatedCost() : BigDecimal.ZERO;
        if (estimatedCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Total estimated cost cannot be negative");
        }

        TreatmentPlan plan = new TreatmentPlan(
                request.patientId(),
                request.dentistId(),
                request.examinationId(),
                request.createdByUserId(),
                request.planName().trim()
        );

        plan.setStatus(TreatmentPlanStatus.PROPOSED);
        plan.setTotalEstimatedCost(estimatedCost);
        plan.setTotalActualCost(BigDecimal.ZERO);
        plan.setClinicalNotes(trimToNull(request.clinicalNotes()));

        TreatmentPlan saved = treatmentPlanRepository.save(plan);
        return TreatmentPlanResponse.fromEntity(saved);
    }

    @Override
    public TreatmentPlanResponse getTreatmentPlanById(Long id) {
        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));
        return TreatmentPlanResponse.fromEntity(plan);
    }

    @Override
    public TreatmentPlanResponse getTreatmentPlanByIdAndPatientId(Long id, Long patientId) {
        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (!plan.getPatientId().equals(patientId)) {
            throw new PatientMismatchException(patientId, plan.getPatientId());
        }

        return TreatmentPlanResponse.fromEntity(plan);
    }

    @Override
    public List<TreatmentPlanResponse> getTreatmentPlansByPatientId(Long patientId) {
        return treatmentPlanRepository.findByPatientIdOrderByCreatedAtDescIdDesc(patientId)
                .stream()
                .map(TreatmentPlanResponse::fromEntity)
                .toList();
    }

    @Override
    public List<TreatmentPlanResponse> getTreatmentPlansByDentistId(Long dentistId) {
        return treatmentPlanRepository.findByDentistIdOrderByCreatedAtDescIdDesc(dentistId)
                .stream()
                .map(TreatmentPlanResponse::fromEntity)
                .toList();
    }

    @Override
    public List<TreatmentPlanResponse> getTreatmentPlansByExaminationId(Long examinationId) {
        return treatmentPlanRepository.findByExaminationId(examinationId)
                .stream()
                .map(TreatmentPlanResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public TreatmentPlanResponse updateTreatmentPlan(Long id, UpdateTreatmentPlanRequest request) {
        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (plan.getStatus() != TreatmentPlanStatus.PROPOSED && plan.getStatus() != TreatmentPlanStatus.APPROVED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot update treatment plan with status: " + plan.getStatus() + "; only PROPOSED or APPROVED plans can be updated"
            );
        }

        if (request.planName() != null) {
            if (request.planName().trim().isEmpty()) {
                throw new IllegalArgumentException("Plan name cannot be empty");
            }
            if (request.planName().trim().length() > 150) {
                throw new IllegalArgumentException("Plan name cannot exceed 150 characters");
            }
            plan.setPlanName(request.planName().trim());
        }

        if (request.totalEstimatedCost() != null) {
            if (request.totalEstimatedCost().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Total estimated cost cannot be negative");
            }
            plan.setTotalEstimatedCost(request.totalEstimatedCost());
        }

        if (request.clinicalNotes() != null) {
            plan.setClinicalNotes(trimToNull(request.clinicalNotes()));
        }

        TreatmentPlan saved = treatmentPlanRepository.save(plan);
        return TreatmentPlanResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse updateTreatmentPlan(Long id, Long patientId, UpdateTreatmentPlanRequest request) {
        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (!plan.getPatientId().equals(patientId)) {
            throw new PatientMismatchException(patientId, plan.getPatientId());
        }

        return updateTreatmentPlan(id, request);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse approveTreatmentPlan(Long id, ApproveTreatmentPlanRequest request) {
        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (request == null || request.dentistId() == null || !dentistLookupPort.existsActiveDentist(request.dentistId())) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + (request != null ? request.dentistId() : null) + " is not an active dentist authorized to approve treatment plans"
            );
        }

        if (plan.getStatus() == TreatmentPlanStatus.CANCELLED) {
            throw new InvalidTreatmentPlanStateException("Cannot approve a cancelled treatment plan");
        }

        if (plan.getStatus() == TreatmentPlanStatus.APPROVED
                || plan.getStatus() == TreatmentPlanStatus.IN_PROGRESS
                || plan.getStatus() == TreatmentPlanStatus.COMPLETED) {
            throw new InvalidTreatmentPlanStateException(
                    "Treatment plan has already been approved (status: " + plan.getStatus() + ")"
            );
        }

        if (plan.getStatus() != TreatmentPlanStatus.PROPOSED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot approve treatment plan with status: " + plan.getStatus()
            );
        }

        long totalProcedures = treatmentProcedureRepository.countByTreatmentPlanId(id);
        long plannedProcedures = treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(id, ProcedureStatus.PLANNED);

        if (totalProcedures == 0 || plannedProcedures == 0) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot approve treatment plan: requires at least one valid planned procedure"
            );
        }

        plan.setStatus(TreatmentPlanStatus.APPROVED);
        plan.setApprovedByDentistId(request.dentistId());
        plan.setApprovedAt(LocalDateTime.now());

        TreatmentPlan saved = treatmentPlanRepository.save(plan);
        return TreatmentPlanResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse startTreatmentPlan(Long id, Long dentistId) {
        if (dentistId != null && !dentistLookupPort.existsActiveDentist(dentistId)) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + dentistId + " is not an active dentist authorized to start treatment plans"
            );
        }

        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (plan.getStatus() == TreatmentPlanStatus.IN_PROGRESS) {
            return TreatmentPlanResponse.fromEntity(plan);
        }

        if (plan.getStatus() == TreatmentPlanStatus.PROPOSED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot start a proposed treatment plan; plan must be approved first"
            );
        }

        if (plan.getStatus() == TreatmentPlanStatus.COMPLETED || plan.getStatus() == TreatmentPlanStatus.CANCELLED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot start a treatment plan with status: " + plan.getStatus()
            );
        }

        plan.setStatus(TreatmentPlanStatus.IN_PROGRESS);
        TreatmentPlan saved = treatmentPlanRepository.save(plan);
        return TreatmentPlanResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse startTreatmentPlan(Long id) {
        return startTreatmentPlan(id, null);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse completeTreatmentPlan(Long id, Long dentistId) {
        if (dentistId != null && !dentistLookupPort.existsActiveDentist(dentistId)) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + dentistId + " is not an active dentist authorized to complete treatment plans"
            );
        }

        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (plan.getStatus() == TreatmentPlanStatus.COMPLETED) {
            return TreatmentPlanResponse.fromEntity(plan);
        }

        if (plan.getStatus() != TreatmentPlanStatus.IN_PROGRESS) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot complete treatment plan with status: " + plan.getStatus() + "; only IN_PROGRESS plans can be completed"
            );
        }

        long plannedProcedures = treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(id, ProcedureStatus.PLANNED);
        long inProgressProcedures = treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(id, ProcedureStatus.IN_PROGRESS);

        if (plannedProcedures > 0 || inProgressProcedures > 0) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot complete treatment plan: contains " + (plannedProcedures + inProgressProcedures) + " unfinished procedures"
            );
        }

        long completedProcedures = treatmentProcedureRepository.countByTreatmentPlanIdAndStatus(id, ProcedureStatus.COMPLETED);
        if (completedProcedures == 0) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot complete treatment plan without at least one completed procedure"
            );
        }

        List<TreatmentProcedure> procedures = treatmentProcedureRepository.findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(id);
        BigDecimal totalActual = procedures.stream()
                .filter(p -> p.getStatus() == ProcedureStatus.COMPLETED)
                .map(TreatmentProcedure::getActualCost)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        plan.setTotalActualCost(totalActual);
        plan.setStatus(TreatmentPlanStatus.COMPLETED);
        plan.setCompletedAt(LocalDateTime.now());

        TreatmentPlan saved = treatmentPlanRepository.save(plan);
        return TreatmentPlanResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse completeTreatmentPlan(Long id) {
        return completeTreatmentPlan(id, null);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse cancelTreatmentPlan(Long id, CancelTreatmentPlanRequest request) {
        if (request != null && request.dentistId() != null && !dentistLookupPort.existsActiveDentist(request.dentistId())) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + request.dentistId() + " is not an active dentist authorized to cancel treatment plans"
            );
        }

        String reason = request != null ? request.cancellationReason() : null;
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }

        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (plan.getStatus() == TreatmentPlanStatus.COMPLETED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot cancel a completed treatment plan; clinical history must be preserved"
            );
        }

        if (plan.getStatus() == TreatmentPlanStatus.CANCELLED) {
            return TreatmentPlanResponse.fromEntity(plan);
        }

        plan.setStatus(TreatmentPlanStatus.CANCELLED);
        plan.setCancellationReason(reason.trim());

        TreatmentPlan saved = treatmentPlanRepository.save(plan);
        return TreatmentPlanResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentPlanResponse cancelTreatmentPlan(Long id, String cancellationReason) {
        return cancelTreatmentPlan(id, new CancelTreatmentPlanRequest(null, cancellationReason));
    }

    @Override
    @Transactional
    public TreatmentPlanResponse setFollowUpDate(Long id, FollowUpRequest request) {
        TreatmentPlan plan = treatmentPlanRepository.findById(id)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(id));

        if (request == null || request.dentistId() == null || !dentistLookupPort.existsActiveDentist(request.dentistId())) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + (request != null ? request.dentistId() : null) + " is not an active dentist authorized to schedule follow-up"
            );
        }

        if (plan.getStatus() == TreatmentPlanStatus.CANCELLED) {
            throw new InvalidTreatmentPlanStateException("Cannot set follow-up date on a cancelled treatment plan");
        }

        if (request.followUpDate() == null) {
            throw new IllegalArgumentException("Follow-up date is required");
        }

        LocalDate planDate = plan.getCreatedAt() != null ? plan.getCreatedAt().toLocalDate() : LocalDate.now();
        if (request.followUpDate().isBefore(planDate)) {
            throw new IllegalArgumentException(
                    "Follow-up date cannot be before treatment plan creation date: " + planDate
            );
        }

        String noteContent = request.clinicalNotes() != null && !request.clinicalNotes().trim().isEmpty()
                ? request.clinicalNotes().trim()
                : "Follow-up appointment scheduled for " + request.followUpDate();

        ClinicalProgressNote progressNote = new ClinicalProgressNote(
                plan.getId(),
                null,
                request.dentistId(),
                noteContent,
                request.followUpDate()
        );
        clinicalProgressNoteRepository.save(progressNote);

        return TreatmentPlanResponse.fromEntity(plan);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
