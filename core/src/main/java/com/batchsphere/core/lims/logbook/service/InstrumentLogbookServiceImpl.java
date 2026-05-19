package com.batchsphere.core.lims.logbook.service;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.equipment.entity.Equipment;
import com.batchsphere.core.lims.equipment.repository.EquipmentRepository;
import com.batchsphere.core.lims.logbook.dto.InstrumentLogbookDtos.CreateInstrumentUsageLogRequest;
import com.batchsphere.core.lims.logbook.dto.InstrumentLogbookDtos.InstrumentUsageLogResponse;
import com.batchsphere.core.lims.logbook.entity.InstrumentUsageLog;
import com.batchsphere.core.lims.logbook.repository.InstrumentUsageLogRepository;
import com.batchsphere.core.qms.deviation.entity.Deviation;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InstrumentLogbookServiceImpl implements InstrumentLogbookService {
    private final InstrumentUsageLogRepository logRepository;
    private final EquipmentRepository equipmentRepository;
    private final DeviationRepository deviationRepository;
    private final AuditEventService auditEventService;

    @Override
    @Transactional
    public InstrumentUsageLogResponse createManualEntry(CreateInstrumentUsageLogRequest request, String actor) {
        if (request.getEquipmentId() == null) {
            throw new BusinessConflictException("equipmentId is required");
        }
        Equipment equipment = equipment(request.getEquipmentId());
        String condition = condition(request.getCondition());
        if ("ANOMALY".equals(condition) && !StringUtils.hasText(request.getAnomalyDescription())) {
            throw new BusinessConflictException("anomalyDescription is required when condition is ANOMALY");
        }
        LocalDateTime now = LocalDateTime.now();
        String entryActor = actor(request.getUsedBy(), actor);
        InstrumentUsageLog log = InstrumentUsageLog.builder()
                .id(UUID.randomUUID())
                .equipmentId(equipment.getId())
                .usedBy(entryActor)
                .usedAt(request.getUsedAt() != null ? request.getUsedAt() : LocalDateTime.now())
                .purpose(trim(request.getPurpose()))
                .samplingRequestId(request.getSamplingRequestId())
                .conditionAtUse(condition)
                .anomalyDescription(trim(request.getAnomalyDescription()))
                .linkedDeviationId(request.getLinkedDeviationId())
                .createdAt(now)
                .createdBy(entryActor)
                .isActive(true)
                .build();
        logRepository.save(log);
        auditEventService.record("INSTRUMENT_USAGE_LOG", log.getId(), AuditEventType.CREATE, "conditionAtUse", null, log.getConditionAtUse(),
                "Manual log entry", log.getUsedBy(), "LIMS_LOGBOOK");
        return map(log, equipment, deviationMap(List.of(log)));
    }

    @Override
    @Transactional
    public void logAutoUsage(UUID equipmentId, UUID samplingRequestId, String purpose, String actor) {
        Equipment equipment = equipment(equipmentId);
        LocalDateTime now = LocalDateTime.now();
        String entryActor = actor(actor, "system");
        InstrumentUsageLog log = InstrumentUsageLog.builder()
                .id(UUID.randomUUID())
                .equipmentId(equipment.getId())
                .usedBy(entryActor)
                .usedAt(now)
                .purpose(StringUtils.hasText(purpose) ? purpose.trim() : "QC worksheet result")
                .samplingRequestId(samplingRequestId)
                .conditionAtUse("NORMAL")
                .createdAt(now)
                .createdBy(entryActor)
                .isActive(true)
                .build();
        logRepository.save(log);
        auditEventService.record("INSTRUMENT_USAGE_LOG", log.getId(), AuditEventType.CREATE, "conditionAtUse", null, "NORMAL",
                "Auto-log from test result", log.getUsedBy(), "QC_WORKSHEET");
    }

    @Override
    public List<InstrumentUsageLogResponse> getEquipmentLogbook(UUID equipmentId) {
        equipment(equipmentId);
        return mapAll(logRepository.findByEquipmentIdAndIsActiveTrueOrderByUsedAtDesc(equipmentId));
    }

    @Override
    public List<InstrumentUsageLogResponse> getLogbook(String usedBy) {
        List<InstrumentUsageLog> logs = StringUtils.hasText(usedBy)
                ? logRepository.findByUsedByIgnoreCaseAndIsActiveTrueOrderByUsedAtDesc(usedBy.trim())
                : logRepository.findAllByIsActiveTrueOrderByUsedAtDesc();
        return mapAll(logs);
    }

    private List<InstrumentUsageLogResponse> mapAll(List<InstrumentUsageLog> logs) {
        Map<UUID, Equipment> equipmentById = equipmentRepository.findAllById(logs.stream().map(InstrumentUsageLog::getEquipmentId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Equipment::getId, Function.identity()));
        Map<UUID, Deviation> deviationById = deviationMap(logs);
        return logs.stream().map(log -> map(log, equipmentById.get(log.getEquipmentId()), deviationById)).toList();
    }

    private Map<UUID, Deviation> deviationMap(List<InstrumentUsageLog> logs) {
        return deviationRepository.findAllById(logs.stream()
                        .map(InstrumentUsageLog::getLinkedDeviationId)
                        .filter(id -> id != null)
                        .collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Deviation::getId, Function.identity()));
    }

    private InstrumentUsageLogResponse map(InstrumentUsageLog log, Equipment equipment, Map<UUID, Deviation> deviationById) {
        Deviation deviation = log.getLinkedDeviationId() != null ? deviationById.get(log.getLinkedDeviationId()) : null;
        return InstrumentUsageLogResponse.builder()
                .id(log.getId())
                .equipmentId(log.getEquipmentId())
                .equipmentCode(equipment != null ? equipment.getEquipmentId() : null)
                .equipmentName(equipment != null ? equipment.getName() : null)
                .usedBy(log.getUsedBy())
                .usedAt(log.getUsedAt())
                .purpose(log.getPurpose())
                .samplingRequestId(log.getSamplingRequestId())
                .condition(log.getConditionAtUse())
                .anomalyDescription(log.getAnomalyDescription())
                .linkedDeviationId(log.getLinkedDeviationId())
                .linkedDeviationNumber(deviation != null ? deviation.getDeviationNumber() : null)
                .createdAt(log.getCreatedAt())
                .createdBy(log.getCreatedBy())
                .updatedAt(log.getUpdatedAt())
                .updatedBy(log.getUpdatedBy())
                .active(log.getIsActive())
                .build();
    }

    private Equipment equipment(UUID id) {
        return equipmentRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id));
    }

    private String condition(String value) {
        String condition = StringUtils.hasText(value) ? value.trim().toUpperCase() : "NORMAL";
        if (!condition.equals("NORMAL") && !condition.equals("ANOMALY")) {
            throw new BusinessConflictException("condition must be NORMAL or ANOMALY");
        }
        return condition;
    }

    private String actor(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
