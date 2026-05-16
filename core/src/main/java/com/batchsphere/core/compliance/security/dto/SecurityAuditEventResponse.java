package com.batchsphere.core.compliance.security.dto;

import com.batchsphere.core.compliance.security.entity.SecurityAuditEventType;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class SecurityAuditEventResponse {
    private UUID id;
    private SecurityAuditEventType eventType;
    private String username;
    private String ipAddress;
    private String details;
    private OffsetDateTime occurredAt;
}
