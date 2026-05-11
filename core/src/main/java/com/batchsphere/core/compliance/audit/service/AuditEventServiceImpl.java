package com.batchsphere.core.compliance.audit.service;

import com.batchsphere.core.compliance.audit.dto.AuditEventResponse;
import com.batchsphere.core.compliance.audit.entity.AuditEvent;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditEventServiceImpl implements AuditEventService {

    private final AuditEventRepository auditEventRepository;

    @Override
    public void record(String entityType,
                       UUID entityId,
                       AuditEventType eventType,
                       String fieldName,
                       String oldValue,
                       String newValue,
                       String reason,
                       String actor,
                       String source) {
        if (!StringUtils.hasText(entityType) || entityId == null || eventType == null || !StringUtils.hasText(actor)) {
            return;
        }
        auditEventRepository.save(AuditEvent.builder()
                .id(UUID.randomUUID())
                .entityType(entityType.trim())
                .entityId(entityId)
                .eventType(eventType)
                .fieldName(StringUtils.hasText(fieldName) ? fieldName.trim() : null)
                .oldValue(oldValue)
                .newValue(newValue)
                .reason(StringUtils.hasText(reason) ? reason.trim() : null)
                .actor(actor.trim())
                .eventAt(LocalDateTime.now())
                .source(StringUtils.hasText(source) ? source.trim() : "APPLICATION")
                .isActive(true)
                .build());
    }

    @Override
    public List<AuditEventResponse> getEvents(String entityType, UUID entityId) {
        return auditEventRepository.findByEntityTypeAndEntityIdAndIsActiveTrueOrderByEventAtDesc(entityType, entityId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AuditEventResponse toResponse(AuditEvent event) {
        return AuditEventResponse.builder()
                .id(event.getId())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .eventType(event.getEventType())
                .fieldName(event.getFieldName())
                .oldValue(event.getOldValue())
                .newValue(event.getNewValue())
                .reason(event.getReason())
                .actor(event.getActor())
                .eventAt(event.getEventAt())
                .source(event.getSource())
                .build();
    }
}
