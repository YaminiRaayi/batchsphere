package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
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
import com.batchsphere.core.transactions.sampling.entity.QcWorksheet;
import com.batchsphere.core.transactions.sampling.entity.QcWorksheetStatus;
import com.batchsphere.core.transactions.sampling.entity.Sample;
import com.batchsphere.core.transactions.sampling.repository.QcTestResultRepository;
import com.batchsphere.core.transactions.sampling.repository.QcWorksheetRepository;
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
    private final QcWorksheetRepository qcWorksheetRepository;
    private final SpecParameterRepository specParameterRepository;
    private final SampleRepository sampleRepository;
    private final MoaRepository moaRepository;
    private final AuditEventService auditEventService;

    @Override
    public List<QcTestResultResponse> generateWorksheet(UUID sampleId, UUID specId, String analystCode, String actor) {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample not found with id: " + sampleId));
        QcWorksheet worksheet = qcWorksheetRepository.findBySampleIdAndIsActiveTrue(sampleId).orElse(null);
        if (worksheet != null) {
            List<QcTestResult> existing = qcTestResultRepository.findByWorksheetIdAndIsActiveTrueOrderByCreatedAtAsc(worksheet.getId());
            if (!existing.isEmpty()) {
                refreshWorksheetStatus(worksheet, existing, actor);
                QcWorksheet refreshed = qcWorksheetRepository.findById(worksheet.getId()).orElse(worksheet);
                return existing.stream().map(row -> toResponse(row, refreshed)).toList();
            }
        }

        List<SpecParameter> parameters = specParameterRepository.findBySpecIdAndIsActiveTrueOrderBySequenceAsc(specId);
        if (parameters.isEmpty()) {
            throw new BusinessConflictException("Approved spec has no active test parameters; worksheet cannot be generated");
        }

        LocalDateTime now = LocalDateTime.now();
        if (worksheet == null) {
            worksheet = QcWorksheet.builder()
                    .id(UUID.randomUUID())
                    .samplingRequestId(sample.getSamplingRequestId())
                    .sampleId(sample.getId())
                    .specId(specId)
                    .status(QcWorksheetStatus.GENERATED)
                    .assignedAnalyst(analystCode)
                    .generatedAt(now)
                    .generatedBy(actor)
                    .isActive(true)
                    .createdBy(actor)
                    .createdAt(now)
                    .build();
            qcWorksheetRepository.save(worksheet);
            auditEventService.record(
                    "QC_WORKSHEET",
                    worksheet.getId(),
                    AuditEventType.CREATE,
                    "status",
                    null,
                    worksheet.getStatus().name(),
                    "QC worksheet generated from approved spec",
                    actor,
                    "QC_WORKSHEET"
            );
        }
        for (SpecParameter parameter : parameters) {
            QcTestResult row = QcTestResult.builder()
                    .id(UUID.randomUUID())
                    .sampleId(sample.getId())
                    .worksheetId(worksheet.getId())
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
        QcWorksheet worksheet = qcWorksheetRepository.findBySampleIdAndIsActiveTrue(sampleId).orElse(null);
        List<QcTestResult> rows = worksheet != null
                ? qcTestResultRepository.findByWorksheetIdAndIsActiveTrueOrderByCreatedAtAsc(worksheet.getId())
                : qcTestResultRepository.findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(sampleId);
        if (worksheet != null) {
            refreshWorksheetStatus(worksheet, rows, null);
            worksheet = qcWorksheetRepository.findById(worksheet.getId()).orElse(worksheet);
        }
        QcWorksheet finalWorksheet = worksheet;
        return rows
                .stream()
                .map(row -> toResponse(row, finalWorksheet))
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

    public void markWorksheetInProgress(UUID sampleId, String actor) {
        qcWorksheetRepository.findBySampleIdAndIsActiveTrue(sampleId).ifPresent(worksheet -> {
            if (worksheet.getStatus() == QcWorksheetStatus.GENERATED) {
                worksheet.setStatus(QcWorksheetStatus.IN_PROGRESS);
                worksheet.setUpdatedBy(actor);
                worksheet.setUpdatedAt(LocalDateTime.now());
                qcWorksheetRepository.save(worksheet);
                auditEventService.record(
                        "QC_WORKSHEET",
                        worksheet.getId(),
                        AuditEventType.STATUS_CHANGE,
                        "status",
                        QcWorksheetStatus.GENERATED.name(),
                        QcWorksheetStatus.IN_PROGRESS.name(),
                        "First worksheet result recorded",
                        actor,
                        "QC_WORKSHEET"
                );
            }
        });
    }

    private QcTestResultResponse toResponse(QcTestResult row, QcWorksheet worksheet) {
        SpecParameter parameter = getParameter(row.getSpecParameterId());
        Moa specMoa = parameter.getMoaId() != null ? moaRepository.findById(parameter.getMoaId()).orElse(null) : null;
        Moa usedMoa = row.getMoaIdUsed() != null ? moaRepository.findById(row.getMoaIdUsed()).orElse(null) : null;
        return QcTestResultResponse.builder()
                .id(row.getId())
                .sampleId(row.getSampleId())
                .worksheetId(row.getWorksheetId())
                .samplingRequestId(worksheet != null ? worksheet.getSamplingRequestId() : null)
                .specId(worksheet != null ? worksheet.getSpecId() : null)
                .worksheetStatus(worksheet != null ? worksheet.getStatus() : null)
                .assignedAnalyst(worksheet != null ? worksheet.getAssignedAnalyst() : row.getAnalystCode())
                .worksheetReviewer(worksheet != null ? worksheet.getReviewer() : null)
                .worksheetGeneratedAt(worksheet != null ? worksheet.getGeneratedAt() : null)
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
                .requiresInstrument(parameter.getRequiresInstrument())
                .sequence(parameter.getSequence())
                .enteredAt(row.getEnteredAt())
                .remarks(row.getRemarks())
                .isLocked(row.getIsLocked())
                .equipmentId(row.getEquipmentId())
                .instrumentRef(row.getInstrumentRef())
                .reagentLotId(row.getReagentLotId())
                .build();
    }

    private void refreshWorksheetStatus(QcWorksheet worksheet, List<QcTestResult> rows, String actor) {
        if (rows.isEmpty() || worksheet.getStatus() == QcWorksheetStatus.REVIEWED) {
            return;
        }
        boolean anyEntered = rows.stream().anyMatch(row -> row.getStatus() != QcTestResultStatus.PENDING);
        boolean mandatoryComplete = rows.stream()
                .filter(row -> Boolean.TRUE.equals(getParameter(row.getSpecParameterId()).getIsMandatory()))
                .allMatch(row -> row.getStatus() == QcTestResultStatus.PASS);
        QcWorksheetStatus nextStatus = mandatoryComplete
                ? QcWorksheetStatus.COMPLETE
                : anyEntered ? QcWorksheetStatus.IN_PROGRESS : QcWorksheetStatus.GENERATED;
        if (worksheet.getStatus() != nextStatus) {
            QcWorksheetStatus oldStatus = worksheet.getStatus();
            worksheet.setStatus(nextStatus);
            worksheet.setUpdatedBy(actor);
            worksheet.setUpdatedAt(LocalDateTime.now());
            qcWorksheetRepository.save(worksheet);
            auditEventService.record(
                    "QC_WORKSHEET",
                    worksheet.getId(),
                    AuditEventType.STATUS_CHANGE,
                    "status",
                    oldStatus.name(),
                    nextStatus.name(),
                    "QC worksheet status recalculated",
                    actor != null ? actor : "system",
                    "QC_WORKSHEET"
            );
        }
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
