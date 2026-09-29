package com.dentcare.clinical.service;

import com.dentcare.clinical.dto.AddToothFindingRequest;
import com.dentcare.clinical.dto.ToothFindingResponse;
import com.dentcare.clinical.dto.UpdateToothFindingRequest;
import com.dentcare.clinical.entity.ClinicalExamination;
import com.dentcare.clinical.entity.ExaminationStatus;
import com.dentcare.clinical.entity.ToothFinding;
import com.dentcare.clinical.exception.ClinicalExaminationNotFoundException;
import com.dentcare.clinical.exception.InvalidClinicalExaminationStateException;
import com.dentcare.clinical.exception.InvalidToothNumberException;
import com.dentcare.clinical.exception.ToothFindingNotFoundException;
import com.dentcare.clinical.repository.ClinicalExaminationRepository;
import com.dentcare.clinical.repository.ToothFindingRepository;
import com.dentcare.clinical.validation.FdiToothNumberValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Implementation of {@link ToothFindingService} enforcing FDI tooth notation rules,
 * general condition exclusivity, examination ownership, and status immutability.
 */
@Service
@Transactional(readOnly = true)
public class ToothFindingServiceImpl implements ToothFindingService {

    private final ToothFindingRepository toothFindingRepository;
    private final ClinicalExaminationRepository examinationRepository;

    public ToothFindingServiceImpl(ToothFindingRepository toothFindingRepository,
                                   ClinicalExaminationRepository examinationRepository) {
        this.toothFindingRepository = toothFindingRepository;
        this.examinationRepository = examinationRepository;
    }

    @Override
    @Transactional
    public ToothFindingResponse addToothFinding(Long examinationId, AddToothFindingRequest request) {
        ClinicalExamination examination = examinationRepository.findById(examinationId)
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(examinationId));

        if (examination.getStatus() != ExaminationStatus.DRAFT) {
            throw new InvalidClinicalExaminationStateException(
                    "Cannot add tooth findings to an examination with status: " + examination.getStatus()
            );
        }

        if (request.conditionName() == null || request.conditionName().trim().isEmpty()) {
            throw new IllegalArgumentException("Condition name is required");
        }

        if (request.recordedByUserId() == null) {
            throw new IllegalArgumentException("Recorded-by user ID is required");
        }

        validateToothFindingSpecification(request.isGeneral(), request.toothNumber());

        ToothFinding finding = new ToothFinding(
                examinationId,
                request.isGeneral() ? null : request.toothNumber(),
                request.isGeneral(),
                request.conditionName().trim(),
                trimToNull(request.notes()),
                request.recordedByUserId()
        );

        ToothFinding saved = toothFindingRepository.save(finding);
        return ToothFindingResponse.fromEntity(saved);
    }

    @Override
    public ToothFindingResponse getToothFindingById(Long id) {
        ToothFinding finding = toothFindingRepository.findById(id)
                .orElseThrow(() -> new ToothFindingNotFoundException(id));
        return ToothFindingResponse.fromEntity(finding);
    }

    @Override
    public ToothFindingResponse getToothFindingByIdAndExaminationId(Long id, Long examinationId) {
        ToothFinding finding = toothFindingRepository.findById(id)
                .orElseThrow(() -> new ToothFindingNotFoundException(id));

        if (!finding.getExaminationId().equals(examinationId)) {
            throw new IllegalArgumentException(
                    "Tooth finding " + id + " does not belong to examination " + examinationId
            );
        }

        return ToothFindingResponse.fromEntity(finding);
    }

    @Override
    public List<ToothFindingResponse> getToothFindingsByExaminationId(Long examinationId) {
        if (!examinationRepository.existsById(examinationId)) {
            throw new ClinicalExaminationNotFoundException(examinationId);
        }
        return toothFindingRepository.findByExaminationId(examinationId)
                .stream()
                .map(ToothFindingResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ToothFindingResponse> getToothFindingsByTooth(Long examinationId, Integer toothNumber) {
        if (!examinationRepository.existsById(examinationId)) {
            throw new ClinicalExaminationNotFoundException(examinationId);
        }
        if (!FdiToothNumberValidator.isValidStrict(toothNumber)) {
            throw new InvalidToothNumberException("Invalid FDI tooth number: " + toothNumber);
        }
        return toothFindingRepository.findByExaminationIdAndToothNumber(examinationId, toothNumber)
                .stream()
                .map(ToothFindingResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public ToothFindingResponse updateToothFinding(Long id, UpdateToothFindingRequest request) {
        ToothFinding finding = toothFindingRepository.findById(id)
                .orElseThrow(() -> new ToothFindingNotFoundException(id));

        ClinicalExamination examination = examinationRepository.findById(finding.getExaminationId())
                .orElseThrow(() -> new ClinicalExaminationNotFoundException(finding.getExaminationId()));

        if (examination.getStatus() != ExaminationStatus.DRAFT) {
            throw new InvalidClinicalExaminationStateException(
                    "Cannot update tooth finding for an examination with status: " + examination.getStatus()
            );
        }

        if (request.conditionName() == null || request.conditionName().trim().isEmpty()) {
            throw new IllegalArgumentException("Condition name is required");
        }

        validateToothFindingSpecification(request.isGeneral(), request.toothNumber());

        finding.setGeneral(request.isGeneral());
        finding.setToothNumber(request.isGeneral() ? null : request.toothNumber());
        finding.setConditionName(request.conditionName().trim());
        finding.setNotes(trimToNull(request.notes()));

        ToothFinding saved = toothFindingRepository.save(finding);
        return ToothFindingResponse.fromEntity(saved);
    }

    private void validateToothFindingSpecification(boolean isGeneral, Integer toothNumber) {
        if (isGeneral) {
            if (toothNumber != null) {
                throw new InvalidToothNumberException("General oral cavity findings must not specify a tooth number");
            }
        } else {
            if (toothNumber == null) {
                throw new InvalidToothNumberException("Tooth number is required when finding is not general");
            }
            if (!FdiToothNumberValidator.isValidStrict(toothNumber)) {
                throw new InvalidToothNumberException("Invalid FDI tooth number: " + toothNumber);
            }
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
