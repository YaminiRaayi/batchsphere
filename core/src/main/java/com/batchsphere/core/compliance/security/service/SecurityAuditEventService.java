package com.batchsphere.core.compliance.security.service;

import com.batchsphere.core.compliance.security.dto.SecurityAuditEventResponse;
import com.batchsphere.core.compliance.security.entity.SecurityAuditEventType;

import java.time.OffsetDateTime;
import java.util.List;

public interface SecurityAuditEventService {

    void record(SecurityAuditEventType type, String username, String ipAddress, String userAgent, String details);

    List<SecurityAuditEventResponse> getEvents(String username, OffsetDateTime from, OffsetDateTime to);
}
