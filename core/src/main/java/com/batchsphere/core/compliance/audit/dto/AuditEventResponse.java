package com.batchsphere.core.compliance.audit.dto;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class AuditEventResponse {
    UUID id;
    String entityType;
    UUID entityId;
    AuditEventType eventType;
    String fieldName;
    String oldValue;
    String newValue;
    String reason;
    String actor;
    LocalDateTime eventAt;
    String source;
}
