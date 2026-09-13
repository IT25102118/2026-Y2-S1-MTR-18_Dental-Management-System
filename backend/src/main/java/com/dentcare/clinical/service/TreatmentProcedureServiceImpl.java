package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.AddTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CancelTreatmentProcedureRequest;
import com.dentcare.clinical.dto.CompleteTreatmentProcedureRequest;
import com.dentcare.clinical.dto.TreatmentProcedureResponse;
import com.dentcare.clinical.dto.UpdateTreatmentProcedureRequest;
import com.dentcare.clinical.entity.ClinicalProgressNote;
import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;
import com.dentcare.clinical.entity.TreatmentProcedure;
import com.dentcare.clinical.exception.InvalidToothNumberException;
import com.dentcare.clinical.exception.InvalidTreatmentPlanStateException;
import com.dentcare.clinical.exception.InvalidTreatmentProcedureStateException;
import com.dentcare.clinical.exception.TreatmentPlanNotFoundException;
import com.dentcare.clinical.exception.TreatmentProcedureNotFoundException;
import com.dentcare.clinical.exception.UnauthorizedClinicalOperationException;
import com.dentcare.clinical.integration.DentistLookupPort;
import com.dentcare.clinical.repository.ClinicalProgressNoteRepository;
import com.dentcare.clinical.repository.TreatmentPlanRepository;
import com.dentcare.clinical.repository.TreatmentProcedureRepository;
import com.dentcare.clinical.validation.FdiToothNumberValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Implementation of {@link TreatmentProcedureService} managing procedure lifecycle,
 * FDI tooth validation, sequence numbering, cost tracking, and dentist-only authorizations.
 */
@Service
@Transactional(readOnly = true)
public class TreatmentProcedureServiceImpl implements TreatmentProcedureService {

    private final TreatmentProcedureRepository treatmentProcedureRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final ClinicalProgressNoteRepository clinicalProgressNoteRepository;
    private final DentistLookupPort dentistLookupPort;

    public TreatmentProcedureServiceImpl(TreatmentProcedureRepository treatmentProcedureRepository,
                                         TreatmentPlanRepository treatmentPlanRepository,
                                         ClinicalProgressNoteRepository clinicalProgressNoteRepository,
                                         DentistLookupPort dentistLookupPort) {
        this.treatmentProcedureRepository = treatmentProcedureRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.clinicalProgressNoteRepository = clinicalProgressNoteRepository;
        this.dentistLookupPort = dentistLookupPort;
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse addTreatmentProcedure(Long treatmentPlanId, AddTreatmentProcedureRequest request) {
        TreatmentPlan plan = treatmentPlanRepository.findById(treatmentPlanId)
                .orElseThrow(() -> new TreatmentPlanNotFoundException(treatmentPlanId));

        if (plan.getStatus() != TreatmentPlanStatus.PROPOSED && plan.getStatus() != TreatmentPlanStatus.APPROVED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot add procedure to treatment plan with status: " + plan.getStatus() + "; plan must be PROPOSED or APPROVED"
            );
        }

        if (request.procedureName() == null || request.procedureName().trim().isEmpty()) {
            throw new IllegalArgumentException("Procedure name is required");
        }
        if (request.procedureName().trim().length() > 150) {
            throw new IllegalArgumentException("Procedure name cannot exceed 150 characters");
        }

        if (request.procedureCode() != null && request.procedureCode().trim().length() > 50) {
            throw new IllegalArgumentException("Procedure code cannot exceed 50 characters");
        }

        if (request.toothNumber() != null && !FdiToothNumberValidator.isValidStrict(request.toothNumber())) {
            throw new InvalidToothNumberException("Invalid FDI tooth number: " + request.toothNumber());
        }

        if (request.quantity() != null && request.quantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero");
        }

        if (request.unitCost() != null && request.unitCost().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Unit cost cannot be negative");
        }

        BigDecimal estimatedCost = request.estimatedCost();
        if (estimatedCost == null && request.unitCost() != null && request.quantity() != null) {
            estimatedCost = request.unitCost().multiply(BigDecimal.valueOf(request.quantity()));
        } else if (estimatedCost == null) {
            estimatedCost = BigDecimal.ZERO;
        }

        if (estimatedCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Estimated cost cannot be negative");
        }

        Integer sequenceNumber = request.sequenceNumber();
        if (sequenceNumber != null && sequenceNumber < 1) {
            throw new IllegalArgumentException("Sequence number must be at least 1");
        }
        if (sequenceNumber == null) {
            sequenceNumber = (int) treatmentProcedureRepository.countByTreatmentPlanId(treatmentPlanId) + 1;
        }

        TreatmentProcedure procedure = new TreatmentProcedure(
                treatmentPlanId,
                request.toothNumber(),
                request.procedureName().trim(),
                estimatedCost,
                sequenceNumber
        );

        procedure.setProcedureCode(trimToNull(request.procedureCode()));
        procedure.setClinicalProgressNotes(trimToNull(request.clinicalProgressNotes()));
        procedure.setStatus(ProcedureStatus.PLANNED);

        TreatmentProcedure saved = treatmentProcedureRepository.save(procedure);
        recalculatePlanEstimatedCost(plan);

        return TreatmentProcedureResponse.fromEntity(saved);
    }

    @Override
    public TreatmentProcedureResponse getTreatmentProcedureById(Long id) {
        TreatmentProcedure procedure = treatmentProcedureRepository.findById(id)
                .orElseThrow(() -> new TreatmentProcedureNotFoundException(id));
        return TreatmentProcedureResponse.fromEntity(procedure);
    }

    @Override
    public List<TreatmentProcedureResponse> getProceduresByTreatmentPlanId(Long treatmentPlanId) {
        if (!treatmentPlanRepository.existsById(treatmentPlanId)) {
            throw new TreatmentPlanNotFoundException(treatmentPlanId);
        }
        return treatmentProcedureRepository.findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(treatmentPlanId)
                .stream()
                .map(TreatmentProcedureResponse::fromEntity)
                .toList();
    }

    @Override
    public List<TreatmentProcedureResponse> getProceduresByTooth(Long treatmentPlanId, Integer toothNumber) {
        if (!treatmentPlanRepository.existsById(treatmentPlanId)) {
            throw new TreatmentPlanNotFoundException(treatmentPlanId);
        }
        if (!FdiToothNumberValidator.isValidStrict(toothNumber)) {
            throw new InvalidToothNumberException("Invalid FDI tooth number: " + toothNumber);
        }
        return treatmentProcedureRepository.findByTreatmentPlanIdAndToothNumber(treatmentPlanId, toothNumber)
                .stream()
                .map(TreatmentProcedureResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse updateTreatmentProcedure(Long id, UpdateTreatmentProcedureRequest request) {
        TreatmentProcedure procedure = treatmentProcedureRepository.findById(id)
                .orElseThrow(() -> new TreatmentProcedureNotFoundException(id));

        if (procedure.getStatus() == ProcedureStatus.COMPLETED || procedure.getStatus() == ProcedureStatus.CANCELLED) {
            throw new InvalidTreatmentProcedureStateException(
                    "Cannot update a procedure with status: " + procedure.getStatus()
            );
        }

        if (request.toothNumber() != null) {
            if (!FdiToothNumberValidator.isValidStrict(request.toothNumber())) {
                throw new InvalidToothNumberException("Invalid FDI tooth number: " + request.toothNumber());
            }
            procedure.setToothNumber(request.toothNumber());
        }

        if (request.procedureName() != null) {
            if (request.procedureName().trim().isEmpty()) {
                throw new IllegalArgumentException("Procedure name cannot be empty");
            }
            if (request.procedureName().trim().length() > 150) {
                throw new IllegalArgumentException("Procedure name cannot exceed 150 characters");
            }
            procedure.setProcedureName(request.procedureName().trim());
        }

        if (request.procedureCode() != null) {
            if (request.procedureCode().trim().length() > 50) {
                throw new IllegalArgumentException("Procedure code cannot exceed 50 characters");
            }
            procedure.setProcedureCode(trimToNull(request.procedureCode()));
        }

        if (request.sequenceNumber() != null) {
            if (request.sequenceNumber() < 1) {
                throw new IllegalArgumentException("Sequence number must be at least 1");
            }
            procedure.setSequenceNumber(request.sequenceNumber());
        }

        if (request.estimatedCost() != null) {
            if (request.estimatedCost().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Estimated cost cannot be negative");
            }
            procedure.setEstimatedCost(request.estimatedCost());
        }

        if (request.clinicalProgressNotes() != null) {
            procedure.setClinicalProgressNotes(trimToNull(request.clinicalProgressNotes()));
        }

        TreatmentProcedure saved = treatmentProcedureRepository.save(procedure);
        treatmentPlanRepository.findById(procedure.getTreatmentPlanId()).ifPresent(this::recalculatePlanEstimatedCost);

        return TreatmentProcedureResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse startTreatmentProcedure(Long id, Long dentistId) {
        if (dentistId != null && !dentistLookupPort.existsActiveDentist(dentistId)) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + dentistId + " is not an active dentist authorized to start procedures"
            );
        }

        TreatmentProcedure procedure = treatmentProcedureRepository.findById(id)
                .orElseThrow(() -> new TreatmentProcedureNotFoundException(id));

        TreatmentPlan plan = treatmentPlanRepository.findById(procedure.getTreatmentPlanId())
                .orElseThrow(() -> new TreatmentPlanNotFoundException(procedure.getTreatmentPlanId()));

        if (plan.getStatus() == TreatmentPlanStatus.CANCELLED) {
            throw new InvalidTreatmentPlanStateException("Cannot start procedure under a CANCELLED treatment plan");
        }
        if (plan.getStatus() == TreatmentPlanStatus.COMPLETED) {
            throw new InvalidTreatmentPlanStateException("Cannot start procedure under a COMPLETED treatment plan");
        }
        if (plan.getStatus() == TreatmentPlanStatus.PROPOSED) {
            throw new InvalidTreatmentPlanStateException(
                    "Cannot start procedure under a PROPOSED treatment plan; plan must be approved first"
            );
        }

        if (procedure.getStatus() == ProcedureStatus.IN_PROGRESS) {
            return TreatmentProcedureResponse.fromEntity(procedure);
        }

        if (procedure.getStatus() == ProcedureStatus.COMPLETED) {
            throw new InvalidTreatmentProcedureStateException("Cannot start a completed procedure");
        }
        if (procedure.getStatus() == ProcedureStatus.CANCELLED) {
            throw new InvalidTreatmentProcedureStateException("Cannot start a cancelled procedure");
        }

        procedure.setStatus(ProcedureStatus.IN_PROGRESS);
        TreatmentProcedure saved = treatmentProcedureRepository.save(procedure);

        if (plan.getStatus() == TreatmentPlanStatus.APPROVED) {
            plan.setStatus(TreatmentPlanStatus.IN_PROGRESS);
            treatmentPlanRepository.save(plan);
        }

        return TreatmentProcedureResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse startTreatmentProcedure(Long id) {
        return startTreatmentProcedure(id, null);
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse completeTreatmentProcedure(Long id, CompleteTreatmentProcedureRequest request) {
        TreatmentProcedure procedure = treatmentProcedureRepository.findById(id)
                .orElseThrow(() -> new TreatmentProcedureNotFoundException(id));

        TreatmentPlan plan = treatmentPlanRepository.findById(procedure.getTreatmentPlanId())
                .orElseThrow(() -> new TreatmentPlanNotFoundException(procedure.getTreatmentPlanId()));

        if (plan.getStatus() == TreatmentPlanStatus.CANCELLED) {
            throw new InvalidTreatmentPlanStateException("Cannot complete procedure under a CANCELLED treatment plan");
        }

        if (procedure.getStatus() == ProcedureStatus.COMPLETED) {
            return TreatmentProcedureResponse.fromEntity(procedure);
        }

        if (procedure.getStatus() == ProcedureStatus.CANCELLED) {
            throw new InvalidTreatmentProcedureStateException("Cannot complete a cancelled procedure");
        }

        if (request == null || request.performedByDentistId() == null || !dentistLookupPort.existsActiveDentist(request.performedByDentistId())) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + (request != null ? request.performedByDentistId() : null) + " is not an active dentist authorized to complete procedures"
            );
        }

        LocalDate completionDate = request.completionDate() != null ? request.completionDate() : LocalDate.now();
        LocalDate creationDate = procedure.getCreatedAt() != null ? procedure.getCreatedAt().toLocalDate() : LocalDate.now();
        if (completionDate.isBefore(creationDate)) {
            throw new IllegalArgumentException(
                    "Completion date (" + completionDate + ") cannot be before procedure creation date: " + creationDate
            );
        }

        BigDecimal actualCost = request.actualCost();
        if (actualCost != null && actualCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Actual cost cannot be negative");
        }
        if (actualCost == null) {
            actualCost = procedure.getEstimatedCost() != null ? procedure.getEstimatedCost() : BigDecimal.ZERO;
        }

        procedure.setStatus(ProcedureStatus.COMPLETED);
        procedure.setCompletionDate(completionDate);
        procedure.setPerformedByDentistId(request.performedByDentistId());
        procedure.setActualCost(actualCost);

        if (request.assistedByUserId() != null) {
            procedure.setAssistedByUserId(request.assistedByUserId());
        }

        if (request.clinicalProgressNotes() != null) {
            String trimmedNotes = trimToNull(request.clinicalProgressNotes());
            procedure.setClinicalProgressNotes(trimmedNotes);

            if (trimmedNotes != null) {
                ClinicalProgressNote note = new ClinicalProgressNote(
                        procedure.getTreatmentPlanId(),
                        procedure.getId(),
                        request.performedByDentistId(),
                        trimmedNotes,
                        null
                );
                clinicalProgressNoteRepository.save(note);
            }
        }

        TreatmentProcedure saved = treatmentProcedureRepository.save(procedure);
        treatmentPlanRepository.findById(procedure.getTreatmentPlanId()).ifPresent(this::recalculatePlanActualCost);

        return TreatmentProcedureResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse cancelTreatmentProcedure(Long id, CancelTreatmentProcedureRequest request) {
        TreatmentProcedure procedure = treatmentProcedureRepository.findById(id)
                .orElseThrow(() -> new TreatmentProcedureNotFoundException(id));

        if (request != null && request.cancelledByDentistId() != null && !dentistLookupPort.existsActiveDentist(request.cancelledByDentistId())) {
            throw new UnauthorizedClinicalOperationException(
                    "User with id " + request.cancelledByDentistId() + " is not an active dentist authorized to cancel procedures"
            );
        }

        String reason = request != null ? request.cancellationReason() : null;
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }

        if (procedure.getStatus() == ProcedureStatus.COMPLETED) {
            throw new InvalidTreatmentProcedureStateException(
                    "Cannot cancel a completed procedure; clinical history must be preserved"
            );
        }

        if (procedure.getStatus() == ProcedureStatus.CANCELLED) {
            return TreatmentProcedureResponse.fromEntity(procedure);
        }

        procedure.setStatus(ProcedureStatus.CANCELLED);
        procedure.setCancellationReason(reason.trim());

        TreatmentProcedure saved = treatmentProcedureRepository.save(procedure);
        treatmentPlanRepository.findById(procedure.getTreatmentPlanId()).ifPresent(this::recalculatePlanEstimatedCost);

        return TreatmentProcedureResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public TreatmentProcedureResponse cancelTreatmentProcedure(Long id, String cancellationReason) {
        return cancelTreatmentProcedure(id, new CancelTreatmentProcedureRequest(null, cancellationReason));
    }

    private void recalculatePlanEstimatedCost(TreatmentPlan plan) {
        List<TreatmentProcedure> procedures = treatmentProcedureRepository
                .findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(plan.getId());
        BigDecimal totalEstimated = procedures.stream()
                .filter(p -> p.getStatus() != ProcedureStatus.CANCELLED)
                .map(TreatmentProcedure::getEstimatedCost)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        plan.setTotalEstimatedCost(totalEstimated);
        treatmentPlanRepository.save(plan);
    }

    private void recalculatePlanActualCost(TreatmentPlan plan) {
        List<TreatmentProcedure> procedures = treatmentProcedureRepository
                .findByTreatmentPlanIdOrderBySequenceNumberAscIdAsc(plan.getId());
        BigDecimal totalActual = procedures.stream()
                .filter(p -> p.getStatus() == ProcedureStatus.COMPLETED)
                .map(TreatmentProcedure::getActualCost)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        plan.setTotalActualCost(totalActual);
        treatmentPlanRepository.save(plan);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
