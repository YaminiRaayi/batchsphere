package com.batchsphere.core.compliance.security.service;

import com.batchsphere.core.compliance.security.dto.SecurityAuditEventResponse;
import com.batchsphere.core.compliance.security.entity.SecurityAuditEvent;
import com.batchsphere.core.compliance.security.entity.SecurityAuditEventType;
import com.batchsphere.core.compliance.security.repository.SecurityAuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecurityAuditEventServiceImpl implements SecurityAuditEventService {

    private final SecurityAuditEventRepository repository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(SecurityAuditEventType type, String username, String ipAddress, String userAgent, String details) {
        SecurityAuditEvent event = SecurityAuditEvent.builder()
                .id(UUID.randomUUID())
                .eventType(type)
                .username(username)
                .ipAddress(ipAddress)
                .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                .details(details)
                .occurredAt(OffsetDateTime.now())
                .build();
        repository.save(event);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SecurityAuditEventResponse> getEvents(String username, OffsetDateTime from, OffsetDateTime to) {
        OffsetDateTime effectiveFrom = from != null ? from : OffsetDateTime.now().minusDays(30);
        OffsetDateTime effectiveTo = to != null ? to : OffsetDateTime.now();

        List<SecurityAuditEvent> events = username != null && !username.isBlank()
                ? repository.findByUsernameAndOccurredAtBetweenOrderByOccurredAtDesc(username, effectiveFrom, effectiveTo)
                : repository.findByOccurredAtBetweenOrderByOccurredAtDesc(effectiveFrom, effectiveTo);

        return events.stream().map(this::toResponse).toList();
    }

    private SecurityAuditEventResponse toResponse(SecurityAuditEvent e) {
        return SecurityAuditEventResponse.builder()
                .id(e.getId())
                .eventType(e.getEventType())
                .username(e.getUsername())
                .ipAddress(e.getIpAddress())
                .details(e.getDetails())
                .occurredAt(e.getOccurredAt())
                .build();
    }
}
