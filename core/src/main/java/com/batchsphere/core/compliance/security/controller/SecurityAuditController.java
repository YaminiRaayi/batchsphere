package com.batchsphere.core.compliance.security.controller;

import com.batchsphere.core.compliance.security.dto.SecurityAuditEventResponse;
import com.batchsphere.core.compliance.security.service.SecurityAuditEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit/security-events")
@RequiredArgsConstructor
public class SecurityAuditController {

    private final SecurityAuditEventService securityAuditEventService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN')")
    public ResponseEntity<List<SecurityAuditEventResponse>> getEvents(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {
        return ResponseEntity.ok(securityAuditEventService.getEvents(username, from, to));
    }
}
