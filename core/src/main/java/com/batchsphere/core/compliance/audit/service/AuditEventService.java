package com.batchsphere.core.compliance.audit.service;

import com.batchsphere.core.compliance.audit.dto.AuditEventResponse;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;

import java.util.List;
import java.util.UUID;

public interface AuditEventService {
    void record(String entityType,
                UUID entityId,
                AuditEventType eventType,
                String fieldName,
                String oldValue,
                String newValue,
                String reason,
                String actor,
                String source);

    List<AuditEventResponse> getEvents(String entityType, UUID entityId);
}
