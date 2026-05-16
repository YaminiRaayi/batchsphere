package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.RecordLockedException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.equipment.entity.Equipment;
import com.batchsphere.core.lims.equipment.entity.EquipmentStatus;
import com.batchsphere.core.lims.equipment.repository.EquipmentRepository;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.transactions.sampling.dto.AmendQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.entity.QcDisposition;
import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import com.batchsphere.core.transactions.sampling.entity.QcTestResult;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import com.batchsphere.core.transactions.sampling.repository.QcDispositionRepository;
import com.batchsphere.core.transactions.sampling.repository.QcTestResultRepository;
import com.batchsphere.core.transactions.sampling.repository.SampleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QcTestResultServiceImpl implements QcTestResultService {

    private final QcTestResultRepository qcTestResultRepository;
    private final SpecParameterRepository specParameterRepository;
    private final QcDispositionRepository qcDispositionRepository;
    private final QcWorksheetService qcWorksheetService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;
    private final SampleRepository sampleRepository;
    private final EquipmentRepository equipmentRepository;

    @Override
    @Transactional
    public QcTestResultResponse recordResult(UUID testResultId, RecordQcTestResultRequest request, String actor) {
        QcTestResult row = qcTestResultRepository.findById(testResultId)
                .orElseThrow(() -> new ResourceNotFoundException("QC test result not found with id: " + testResultId));
        if (Boolean.TRUE.equals(row.getIsLocked())) {
            throw new RecordLockedException("QC results are locked after disposition. Contact QC Manager to amend.");
        }
        SpecParameter parameter = specParameterRepository.findById(row.getSpecParameterId())
                .orElseThrow(() -> new ResourceNotFoundException("Spec parameter not found with id: " + row.getSpecParameterId()));
        QcDisposition disposition = qcDispositionRepository.findBySamplingRequestId(resolveSamplingRequestId(row.getSampleId()))
                .orElseThrow(() -> new ResourceNotFoundException("QC disposition not found for sample worksheet"));
        if (disposition.getStatus() != QcDispositionStatus.UNDER_REVIEW) {
            throw new BusinessConflictException("QC results can only be recorded when disposition is UNDER_REVIEW");
        }

        if (request.getEquipmentId() != null) {
            Equipment eq = equipmentRepository.findByIdAndIsActiveTrue(request.getEquipmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + request.getEquipmentId()));
            if (eq.getStatus() != EquipmentStatus.ACTIVE) {
                throw new BusinessConflictException(
                        "Instrument " + eq.getEquipmentId() + " is not ACTIVE (status: " + eq.getStatus() + ")");
            }
            if (eq.getNextCalibrationDue() != null && eq.getNextCalibrationDue().isBefore(LocalDate.now())) {
                throw new BusinessConflictException(
                        "Instrument " + eq.getEquipmentId() + " calibration expired on " + eq.getNextCalibrationDue()
                        + ". Recalibrate before recording results.");
            }
            row.setEquipmentId(eq.getId());
            row.setInstrumentRef(eq.getEquipmentId());
        }

        QcTestResultStatus previousStatus = row.getStatus();
        row.setMoaIdUsed(request.getMoaIdUsed() != null ? request.getMoaIdUsed() : row.getMoaIdUsed());
        row.setResultValue(request.getResultValue());
        row.setResultText(StringUtils.hasText(request.getResultText()) ? request.getResultText().trim() : null);
        row.setRemarks(StringUtils.hasText(request.getRemarks()) ? request.getRemarks().trim() : null);
        row.setEnteredAt(LocalDateTime.now());
        row.setUpdatedBy(actor);
        row.setUpdatedAt(LocalDateTime.now());

        ValidationOutcome outcome = validate(parameter, row);
        row.setStatus(outcome.status());
        row.setPassFailFlag(outcome.passFlag());
        qcTestResultRepository.save(row);
        qcWorksheetService.markWorksheetInProgress(row.getSampleId(), actor);
        auditEventService.record(
                "QC_TEST_RESULT",
                row.getId(),
                AuditEventType.UPDATE,
                "status",
                previousStatus != null ? previousStatus.name() : null,
                row.getStatus().name(),
                "QC worksheet result recorded",
                actor,
                "QC_WORKSHEET"
        );

        return qcWorksheetService.getWorksheet(row.getSampleId()).stream()
                .filter(item -> item.getId().equals(row.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("QC test result response not found after update"));
    }

    @Override
    @Transactional
    public QcTestResultResponse amendResult(UUID testResultId, AmendQcTestResultRequest request, String actor) {
        QcTestResult row = qcTestResultRepository.findById(testResultId)
                .orElseThrow(() -> new ResourceNotFoundException("QC test result not found with id: " + testResultId));
        if (!Boolean.TRUE.equals(row.getIsLocked())) {
            throw new BusinessConflictException("Result is not locked; use the standard edit endpoint");
        }

        ESignatureRequest signatureRequest = new ESignatureRequest();
        signatureRequest.setUsername(request.getESignatureUsername());
        signatureRequest.setPassword(request.getESignaturePassword());
        signatureRequest.setMeaning("QC result data amendment");
        eSignatureService.sign("QC_TEST_RESULT", row.getId(), "DATA_AMENDMENT",
                "Authorized data amendment: " + request.getJustification(), actor, signatureRequest,
                request.getJustification());

        if (request.getResultValue() != null) row.setResultValue(request.getResultValue());
        if (StringUtils.hasText(request.getResultText())) row.setResultText(request.getResultText().trim());
        if (StringUtils.hasText(request.getRemarks())) row.setRemarks(request.getRemarks().trim());
        row.setEnteredAt(LocalDateTime.now());
        row.setUpdatedBy(actor);
        row.setUpdatedAt(LocalDateTime.now());
        qcTestResultRepository.save(row);

        auditEventService.record("QC_TEST_RESULT", row.getId(), AuditEventType.WORKFLOW_ACTION,
                "isLocked", "true", "true",
                "DATA_AMENDMENT: " + request.getJustification(), actor, "DATA_AMENDMENT");

        return qcWorksheetService.getWorksheet(row.getSampleId()).stream()
                .filter(item -> item.getId().equals(row.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("QC test result response not found after amendment"));
    }

    @Override
    @Transactional
    public void lockResultsForSamplingRequest(UUID samplingRequestId, String actor) {
        List<UUID> sampleIds = sampleRepository
                .findBySamplingRequestIdOrderBySampleTypeAscCreatedAtAsc(samplingRequestId)
                .stream()
                .map(s -> s.getId())
                .toList();
        if (!sampleIds.isEmpty()) {
            qcTestResultRepository.lockAllBySampleIdIn(sampleIds);
            auditEventService.record("SAMPLING_REQUEST", samplingRequestId, AuditEventType.WORKFLOW_ACTION,
                    "qcResultsLocked", "false", "true",
                    "QC test results locked after disposition", actor, "DATA_LOCK");
        }
    }

    private ValidationOutcome validate(SpecParameter parameter, QcTestResult row) {
        SpecParameterCriteriaType type = row.getCriteriaTypeApplied();
        return switch (type) {
            case NLT -> validateNumeric(row.getResultValue(), row.getLowerLimitApplied(), null, NumericMode.NLT);
            case NMT -> validateNumeric(row.getResultValue(), null, row.getUpperLimitApplied(), NumericMode.NMT);
            case RANGE -> validateNumeric(row.getResultValue(), row.getLowerLimitApplied(), row.getUpperLimitApplied(), NumericMode.RANGE);
            case PASS_FAIL -> validateTextEquals(row.getResultText(), parameter.getTextCriteria());
            case COMPLIES -> validateTextEquals(row.getResultText(), parameter.getTextCriteria());
            case TEXT -> {
                if (!StringUtils.hasText(row.getResultText())) {
                    throw new BusinessConflictException("Result text is required for TEXT criteria");
                }
                yield new ValidationOutcome(QcTestResultStatus.PASS, true);
            }
        };
    }

    private ValidationOutcome validateNumeric(BigDecimal actual, BigDecimal lower, BigDecimal upper, NumericMode mode) {
        if (actual == null) {
            throw new BusinessConflictException("Numeric result value is required");
        }
        boolean pass = switch (mode) {
            case NLT -> lower != null && actual.compareTo(lower) >= 0;
            case NMT -> upper != null && actual.compareTo(upper) <= 0;
            case RANGE -> lower != null && upper != null && actual.compareTo(lower) >= 0 && actual.compareTo(upper) <= 0;
        };
        return new ValidationOutcome(pass ? QcTestResultStatus.PASS : QcTestResultStatus.FAIL, pass);
    }

    private ValidationOutcome validateTextEquals(String actual, String expected) {
        if (!StringUtils.hasText(actual)) {
            throw new BusinessConflictException("Result text is required for text-based criteria");
        }
        boolean pass = StringUtils.hasText(expected)
                ? actual.trim().equalsIgnoreCase(expected.trim())
                : normalize(actual).equals("PASS") || normalize(actual).equals("COMPLIES");
        return new ValidationOutcome(pass ? QcTestResultStatus.PASS : QcTestResultStatus.FAIL, pass);
    }

    private UUID resolveSamplingRequestId(UUID sampleId) {
        return qcDispositionRepository.findBySampleId(sampleId)
                .map(QcDisposition::getSamplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling request not found for sample id: " + sampleId));
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private enum NumericMode {
        NLT,
        NMT,
        RANGE
    }

    private record ValidationOutcome(QcTestResultStatus status, Boolean passFlag) {
    }
}
