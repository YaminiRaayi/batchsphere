package com.batchsphere.core.compliance.delegation.controller;

import com.batchsphere.core.compliance.delegation.dto.ApprovalDelegationDTO.ApprovalDelegationResponse;
import com.batchsphere.core.compliance.delegation.dto.ApprovalDelegationDTO.CreateApprovalDelegationRequest;
import com.batchsphere.core.compliance.delegation.service.ApprovalDelegationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/approval-delegations")
@RequiredArgsConstructor
public class ApprovalDelegationController {

    private final ApprovalDelegationService service;

    @PostMapping
    public ResponseEntity<ApprovalDelegationResponse> create(@Valid @RequestBody CreateApprovalDelegationRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @GetMapping
    public ResponseEntity<List<ApprovalDelegationResponse>> listActive() {
        return ResponseEntity.ok(service.listActive());
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<ApprovalDelegationResponse> revoke(@PathVariable UUID id) {
        return ResponseEntity.ok(service.revoke(id));
    }
}
