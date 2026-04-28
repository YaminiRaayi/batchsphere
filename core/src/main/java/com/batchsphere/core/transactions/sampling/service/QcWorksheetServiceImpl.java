package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.entity.QcTestResult;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import com.batchsphere.core.transactions.sampling.entity.Sample;
import com.batchsphere.core.transactions.sampling.repository.QcTestResultRepository;
import com.batchsphere.core.transactions.sampling.repository.SampleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QcWorksheetServiceImpl implements QcWorksheetService {

    private final QcTestResultRepository qcTestResultRepository;
    private final SpecParameterRepository specParameterRepository;
    private final SampleRepository sampleRepository;
    private final MoaRepository moaRepository;

    @Override
    public List<QcTestResultResponse> generateWorksheet(UUID sampleId, UUID specId, String analystCode, String actor) {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample not found with id: " + sampleId));
        List<QcTestResult> existing = qcTestResultRepository.findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(sampleId);
        if (!existing.isEmpty()) {
            return existing.stream().map(this::toResponse).toList();
        }

        List<SpecParameter> parameters = specParameterRepository.findBySpecIdAndIsActiveTrueOrderBySequenceAsc(specId);
        if (parameters.isEmpty()) {
            throw new BusinessConflictException("Approved spec has no active test parameters; worksheet cannot be generated");
        }

        LocalDateTime now = LocalDateTime.now();
        for (SpecParameter parameter : parameters) {
            QcTestResult row = QcTestResult.builder()
                    .id(UUID.randomUUID())
                    .sampleId(sample.getId())
                    .specParameterId(parameter.getId())
                    .moaIdUsed(parameter.getMoaId())
                    .analystCode(analystCode)
                    .status(QcTestResultStatus.PENDING)
                    .passFailFlag(null)
                    .lowerLimitApplied(parameter.getLowerLimit())
                    .upperLimitApplied(parameter.getUpperLimit())
                    .criteriaTypeApplied(parameter.getCriteriaType())
                    .unitApplied(parameter.getUnit())
                    .isActive(true)
                    .createdBy(actor)
                    .createdAt(now)
                    .build();
            qcTestResultRepository.save(row);
        }

        return getWorksheet(sampleId);
    }

    @Override
    public List<QcTestResultResponse> getWorksheet(UUID sampleId) {
        sampleRepository.findById(sampleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample not found with id: " + sampleId));
        return qcTestResultRepository.findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(sampleId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public boolean isWorksheetComplete(UUID sampleId) {
        List<QcTestResult> rows = qcTestResultRepository.findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(sampleId);
        if (rows.isEmpty()) {
            return false;
        }
        for (QcTestResult row : rows) {
            SpecParameter parameter = getParameter(row.getSpecParameterId());
            if (Boolean.TRUE.equals(parameter.getIsMandatory()) && row.getStatus() != QcTestResultStatus.PASS) {
                return false;
            }
        }
        return true;
    }

    @Override
    public boolean hasFailingResults(UUID sampleId) {
        return qcTestResultRepository.existsBySampleIdAndIsActiveTrueAndStatusIn(
                sampleId, List.of(QcTestResultStatus.FAIL, QcTestResultStatus.OOS));
    }

    private QcTestResultResponse toResponse(QcTestResult row) {
        SpecParameter parameter = getParameter(row.getSpecParameterId());
        Moa specMoa = parameter.getMoaId() != null ? moaRepository.findById(parameter.getMoaId()).orElse(null) : null;
        Moa usedMoa = row.getMoaIdUsed() != null ? moaRepository.findById(row.getMoaIdUsed()).orElse(null) : null;
        return QcTestResultResponse.builder()
                .id(row.getId())
                .sampleId(row.getSampleId())
                .specParameterId(row.getSpecParameterId())
                .moaIdUsed(row.getMoaIdUsed())
                .moaCodeUsed(usedMoa != null ? usedMoa.getMoaCode() : null)
                .analystCode(row.getAnalystCode())
                .parameterName(parameter.getParameterName())
                .testType(parameter.getTestType())
                .specMoaCode(specMoa != null ? specMoa.getMoaCode() : null)
                .specMoaId(parameter.getMoaId())
                .resultValue(row.getResultValue())
                .resultText(row.getResultText())
                .status(row.getStatus())
                .passFailFlag(row.getPassFailFlag())
                .lowerLimitApplied(row.getLowerLimitApplied())
                .upperLimitApplied(row.getUpperLimitApplied())
                .criteriaTypeApplied(row.getCriteriaTypeApplied())
                .unitApplied(row.getUnitApplied())
                .criteriaDisplay(formatCriteria(row.getCriteriaTypeApplied(), row.getLowerLimitApplied(), row.getUpperLimitApplied(), row.getUnitApplied(), parameter.getTextCriteria()))
                .mandatory(parameter.getIsMandatory())
                .sequence(parameter.getSequence())
                .enteredAt(row.getEnteredAt())
                .remarks(row.getRemarks())
                .build();
    }

    private SpecParameter getParameter(UUID id) {
        return specParameterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spec parameter not found with id: " + id));
    }

    private String formatCriteria(SpecParameterCriteriaType type, BigDecimal lower, BigDecimal upper, String unit, String text) {
        return switch (type) {
            case NLT -> "NLT " + printable(lower) + printableUnit(unit);
            case NMT -> "NMT " + printable(upper) + printableUnit(unit);
            case RANGE -> printable(lower) + " - " + printable(upper) + printableUnit(unit);
            case PASS_FAIL, COMPLIES, TEXT -> text != null ? text : "";
        };
    }

    private String printable(BigDecimal value) {
        return value != null ? value.stripTrailingZeros().toPlainString() : "—";
    }

    private String printableUnit(String unit) {
        return unit != null && !unit.isBlank() ? " " + unit : "";
    }
}
