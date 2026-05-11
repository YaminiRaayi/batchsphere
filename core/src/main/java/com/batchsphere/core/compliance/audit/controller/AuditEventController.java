package com.batchsphere.core.compliance.audit.controller;

import com.batchsphere.core.compliance.audit.dto.AuditEventResponse;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit-events")
@RequiredArgsConstructor
public class AuditEventController {

    private final AuditEventService auditEventService;

    @GetMapping
    public ResponseEntity<List<AuditEventResponse>> getEvents(@RequestParam String entityType,
                                                              @RequestParam UUID entityId) {
        return ResponseEntity.ok(auditEventService.getEvents(entityType, entityId));
    }
}
