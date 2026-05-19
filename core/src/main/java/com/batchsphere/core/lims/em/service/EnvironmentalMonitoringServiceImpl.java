package com.batchsphere.core.lims.em.service;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.em.dto.EmDtos.CreateMonitoringPointRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.DismissBreachRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.EmResultResponse;
import com.batchsphere.core.lims.em.dto.EmDtos.LinkBreachDeviationRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.MonitoringPointResponse;
import com.batchsphere.core.lims.em.dto.EmDtos.RecordEmResultRequest;
import com.batchsphere.core.lims.em.entity.EmMonitoringPoint;
import com.batchsphere.core.lims.em.entity.EmResult;
import com.batchsphere.core.lims.em.repository.EmMonitoringPointRepository;
import com.batchsphere.core.lims.em.repository.EmResultRepository;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.repository.RoomRepository;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnvironmentalMonitoringServiceImpl implements EnvironmentalMonitoringService {
    private final EmMonitoringPointRepository pointRepository;
    private final EmResultRepository resultRepository;
    private final RoomRepository roomRepository;
    private final DeviationRepository deviationRepository;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    public List<MonitoringPointResponse> listPoints() {
        List<EmMonitoringPoint> points = pointRepository.findByIsActiveTrueOrderByPointCodeAsc();
        Map<UUID, Room> roomById = loadRooms(points);
        List<EmResult> results = resultRepository.findByIsActiveTrueOrderByRecordedAtDesc();
        return points.stream()
                .map(point -> mapPoint(point, roomById.get(point.getRoomId()), results.stream()
                        .filter(result -> result.getPointId().equals(point.getId()))
                        .findFirst()
                        .orElse(null)))
                .toList();
    }

    @Override
    @Transactional
    public MonitoringPointResponse createPoint(CreateMonitoringPointRequest request) {
        String pointCode = required(request.getPointCode(), "pointCode");
        if (pointRepository.existsByPointCodeIgnoreCase(pointCode)) {
            throw new DuplicateResourceException("Monitoring point already exists: " + pointCode);
        }
        Room room = request.getRoomId() != null ? roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.getRoomId())) : null;
        if (request.getAlertLimit() == null || request.getActionLimit() == null) {
            throw new BusinessConflictException("alertLimit and actionLimit are required");
        }
        EmMonitoringPoint point = EmMonitoringPoint.builder()
                .id(UUID.randomUUID())
                .pointCode(pointCode)
                .pointName(required(request.getPointName(), "pointName"))
                .monitoringType(required(request.getMonitoringType(), "monitoringType").toUpperCase())
                .roomId(request.getRoomId())
                .locationDescription(trim(request.getLocationDescription()))
                .unit(required(request.getUnit(), "unit"))
                .alertLimit(request.getAlertLimit())
                .actionLimit(request.getActionLimit())
                .createdBy(actor(request.getCreatedBy()))
                .createdAt(LocalDateTime.now())
                .build();
        pointRepository.save(point);
        auditEventService.record("EM_MONITORING_POINT", point.getId(), AuditEventType.CREATE, "pointCode", null, point.getPointCode(),
                "Monitoring point added", point.getCreatedBy(), "LIMS_EM");
        return mapPoint(point, room, null);
    }

    @Override
    @Transactional
    public EmResultResponse recordResult(RecordEmResultRequest request) {
        EmMonitoringPoint point = point(request.getPointId());
        if (request.getResultValue() == null) {
            throw new BusinessConflictException("resultValue is required");
        }
        boolean action = request.getResultValue().compareTo(point.getActionLimit()) > 0;
        boolean alert = request.getResultValue().compareTo(point.getAlertLimit()) > 0;
        EmResult result = EmResult.builder()
                .id(UUID.randomUUID())
                .pointId(point.getId())
                .resultValue(request.getResultValue())
                .unit(point.getUnit())
                .recordedAt(request.getRecordedAt() != null ? request.getRecordedAt() : LocalDateTime.now())
                .recordedBy(actor(request.getRecordedBy()))
                .alertBreached(alert)
                .actionBreached(action)
                .notes(trim(request.getNotes()))
                .createdAt(LocalDateTime.now())
                .build();
        resultRepository.save(result);
        auditEventService.record("EM_RESULT", result.getId(), AuditEventType.CREATE, "resultValue", null, result.getResultValue().toPlainString(),
                "Environmental reading recorded", result.getRecordedBy(), "LIMS_EM");
        return mapResult(result, point);
    }

    @Override
    public List<EmResultResponse> listResults(UUID pointId, LocalDate from, LocalDate to) {
        LocalDateTime start = (from != null ? from : LocalDate.now().minusDays(30)).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);
        List<EmResult> results = pointId != null
                ? resultRepository.findByPointIdAndRecordedAtBetweenAndIsActiveTrueOrderByRecordedAtAsc(pointId, start, end)
                : resultRepository.findByRecordedAtBetweenAndIsActiveTrueOrderByRecordedAtDesc(start, end);
        Map<UUID, EmMonitoringPoint> pointById = pointRepository.findAllById(results.stream().map(EmResult::getPointId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(EmMonitoringPoint::getId, Function.identity()));
        return results.stream().map(result -> mapResult(result, pointById.get(result.getPointId()))).toList();
    }

    @Override
    @Transactional
    public EmResultResponse linkDeviation(UUID resultId, LinkBreachDeviationRequest request) {
        EmResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("EM result not found: " + resultId));
        if (!Boolean.TRUE.equals(result.getActionBreached())) {
            throw new BusinessConflictException("Only action-limit breaches can be linked to a deviation");
        }
        if (request.getDeviationId() == null) {
            throw new BusinessConflictException("deviationId is required");
        }
        if (!deviationRepository.existsById(request.getDeviationId())) {
            throw new ResourceNotFoundException("Deviation not found: " + request.getDeviationId());
        }
        UUID previousDeviationId = result.getLinkedDeviationId();
        result.setLinkedDeviationId(request.getDeviationId());
        result.setUpdatedBy(actor(request.getUpdatedBy()));
        result.setUpdatedAt(LocalDateTime.now());
        resultRepository.save(result);
        auditEventService.record("EM_RESULT", result.getId(), AuditEventType.UPDATE, "linkedDeviationId",
                previousDeviationId != null ? previousDeviationId.toString() : null,
                request.getDeviationId().toString(),
                "Deviation linked to environmental breach", result.getUpdatedBy(), "LIMS_EM");
        EmMonitoringPoint point = pointRepository.findById(result.getPointId()).orElse(null);
        return mapResult(result, point);
    }

    @Override
    @Transactional
    public EmResultResponse dismissBreach(UUID resultId, DismissBreachRequest request) {
        EmResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("EM result not found: " + resultId));
        if (!Boolean.TRUE.equals(result.getActionBreached())) {
            throw new BusinessConflictException("Only action-limit breaches can be dismissed");
        }
        if (Boolean.TRUE.equals(result.getBreachDismissed())) {
            throw new BusinessConflictException("Breach already dismissed");
        }
        String reason = required(request.getReason(), "reason");
        required(request.getUsername(), "username");
        required(request.getPassword(), "password");
        required(request.getMeaning(), "meaning");
        String signer = actor(request.getUsername());
        ESignatureRecordResponse signature = eSignatureService.sign(
                "EM_RESULT",
                result.getId(),
                "DISMISS_BREACH",
                "I approve dismissal of this environmental monitoring action-limit breach",
                signer,
                request,
                reason);
        result.setBreachDismissed(true);
        String existingNotes = StringUtils.hasText(result.getNotes()) ? result.getNotes() + " | " : "";
        String dismissalNote = "[BREACH DISMISSED] " + reason;
        String combined = existingNotes + dismissalNote;
        result.setNotes(combined.length() > 500 ? combined.substring(0, 500) : combined);
        result.setUpdatedBy(actor(request.getDismissedBy() != null ? request.getDismissedBy() : signer));
        result.setUpdatedAt(LocalDateTime.now());
        resultRepository.save(result);
        auditEventService.record("EM_RESULT", result.getId(), AuditEventType.E_SIGNATURE, "dismissalESignatureId",
                null, signature.getId().toString(), "Breach dismissal electronically signed", signer, "DISMISS_BREACH");
        auditEventService.record("EM_RESULT", result.getId(), AuditEventType.UPDATE, "breachDismissed",
                "false", "true", "Breach dismissed: " + reason, result.getUpdatedBy(), "LIMS_EM");
        EmMonitoringPoint point = pointRepository.findById(result.getPointId()).orElse(null);
        return mapResult(result, point);
    }

    @Override
    public List<EmResultResponse> breaches() {
        Map<UUID, EmMonitoringPoint> pointById = pointRepository.findByIsActiveTrueOrderByPointCodeAsc().stream()
                .collect(Collectors.toMap(EmMonitoringPoint::getId, Function.identity()));
        return resultRepository.findByActionBreachedTrueAndLinkedDeviationIdIsNullAndBreachDismissedFalseAndIsActiveTrueOrderByRecordedAtDesc()
                .stream()
                .map(result -> mapResult(result, pointById.get(result.getPointId())))
                .toList();
    }

    private MonitoringPointResponse mapPoint(EmMonitoringPoint point, Room room, EmResult lastResult) {
        return MonitoringPointResponse.builder()
                .id(point.getId())
                .pointCode(point.getPointCode())
                .pointName(point.getPointName())
                .monitoringType(point.getMonitoringType())
                .roomId(point.getRoomId())
                .roomName(room != null ? room.getRoomName() : null)
                .locationDescription(point.getLocationDescription())
                .unit(point.getUnit())
                .alertLimit(point.getAlertLimit())
                .actionLimit(point.getActionLimit())
                .lastResult(lastResult != null ? mapResult(lastResult, point) : null)
                .isActive(point.getIsActive())
                .build();
    }

    private EmResultResponse mapResult(EmResult result, EmMonitoringPoint point) {
        return EmResultResponse.builder()
                .id(result.getId())
                .pointId(result.getPointId())
                .pointCode(point != null ? point.getPointCode() : null)
                .pointName(point != null ? point.getPointName() : null)
                .monitoringType(point != null ? point.getMonitoringType() : null)
                .resultValue(result.getResultValue())
                .unit(result.getUnit())
                .recordedAt(result.getRecordedAt())
                .recordedBy(result.getRecordedBy())
                .alertBreached(result.getAlertBreached())
                .actionBreached(result.getActionBreached())
                .suggestDeviation(Boolean.TRUE.equals(result.getActionBreached()) && result.getLinkedDeviationId() == null && !Boolean.TRUE.equals(result.getBreachDismissed()))
                .linkedDeviationId(result.getLinkedDeviationId())
                .breachDismissed(result.getBreachDismissed())
                .notes(result.getNotes())
                .alertLimit(point != null ? point.getAlertLimit() : null)
                .actionLimit(point != null ? point.getActionLimit() : null)
                .build();
    }

    private Map<UUID, Room> loadRooms(List<EmMonitoringPoint> points) {
        return roomRepository.findAllById(points.stream().map(EmMonitoringPoint::getRoomId).filter(id -> id != null).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Room::getId, Function.identity()));
    }

    private EmMonitoringPoint point(UUID id) {
        return pointRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Monitoring point not found: " + id));
    }

    private String required(String value, String field) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessConflictException(field + " is required");
        }
        return value.trim();
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String actor(String value) {
        return StringUtils.hasText(value) ? value.trim() : "system";
    }
}
