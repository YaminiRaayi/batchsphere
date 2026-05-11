package com.batchsphere.core.masterdata.vendorapproval.controller;

import com.batchsphere.core.masterdata.vendorapproval.dto.VendorMaterialApprovalRequest;
import com.batchsphere.core.masterdata.vendorapproval.dto.VendorMaterialApprovalResponse;
import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalStatus;
import com.batchsphere.core.masterdata.vendorapproval.service.VendorMaterialApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vendor-material-approvals")
@RequiredArgsConstructor
public class VendorMaterialApprovalController {

    private final VendorMaterialApprovalService service;

    @PostMapping
    public ResponseEntity<VendorMaterialApprovalResponse> create(@Valid @RequestBody VendorMaterialApprovalRequest request) {
        return ResponseEntity.ok(service.createApproval(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VendorMaterialApprovalResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getApproval(id));
    }

    @GetMapping
    public ResponseEntity<List<VendorMaterialApprovalResponse>> getAll(
            @RequestParam(required = false) UUID vendorId,
            @RequestParam(required = false) UUID vendorBusinessUnitId,
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(required = false) UUID materialId,
            @RequestParam(required = false) VendorMaterialApprovalStatus status
    ) {
        return ResponseEntity.ok(service.getApprovals(vendorId, vendorBusinessUnitId, supplierId, materialId, status));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VendorMaterialApprovalResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody VendorMaterialApprovalRequest request
    ) {
        return ResponseEntity.ok(service.updateApproval(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        service.deactivateApproval(id);
        return ResponseEntity.noContent().build();
    }
}
