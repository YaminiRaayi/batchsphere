package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.entity.QcDisposition;
import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import com.batchsphere.core.transactions.sampling.entity.QcTestResult;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import com.batchsphere.core.transactions.sampling.repository.QcDispositionRepository;
import com.batchsphere.core.transactions.sampling.repository.QcTestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QcTestResultServiceImpl implements QcTestResultService {

    private final QcTestResultRepository qcTestResultRepository;
    private final SpecParameterRepository specParameterRepository;
    private final QcDispositionRepository qcDispositionRepository;
    private final QcWorksheetService qcWorksheetService;

    @Override
    public QcTestResultResponse recordResult(UUID testResultId, RecordQcTestResultRequest request, String actor) {
        QcTestResult row = qcTestResultRepository.findById(testResultId)
                .orElseThrow(() -> new ResourceNotFoundException("QC test result not found with id: " + testResultId));
        SpecParameter parameter = specParameterRepository.findById(row.getSpecParameterId())
                .orElseThrow(() -> new ResourceNotFoundException("Spec parameter not found with id: " + row.getSpecParameterId()));
        QcDisposition disposition = qcDispositionRepository.findBySamplingRequestId(resolveSamplingRequestId(row.getSampleId()))
                .orElseThrow(() -> new ResourceNotFoundException("QC disposition not found for sample worksheet"));
        if (disposition.getStatus() != QcDispositionStatus.UNDER_REVIEW) {
            throw new BusinessConflictException("QC results can only be recorded when disposition is UNDER_REVIEW");
        }

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

        return qcWorksheetService.getWorksheet(row.getSampleId()).stream()
                .filter(item -> item.getId().equals(row.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("QC test result response not found after update"));
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
