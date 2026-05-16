package com.batchsphere.core.masterdata.supplier.sqa.controller;

import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;
import com.batchsphere.core.masterdata.supplier.sqa.dto.SupplierQualityAgreementDTO.*;
import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreementStatus;
import com.batchsphere.core.masterdata.supplier.sqa.service.SupplierQualityAgreementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SupplierQualityAgreementController {

    private final SupplierQualityAgreementService sqaService;

    @GetMapping("/api/supplier-quality-agreements")
    public ResponseEntity<Page<Response>> list(
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(required = false) SupplierQualityAgreementStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(sqaService.list(supplierId, status, pageable));
    }

    @PostMapping("/api/supplier-quality-agreements")
    public ResponseEntity<Response> create(@Valid @RequestBody Request request) {
        return ResponseEntity.ok(sqaService.create(request));
    }

    @GetMapping("/api/supplier-quality-agreements/expiring-soon")
    public ResponseEntity<List<Response>> expiringSoon(@RequestParam(defaultValue = "60") int days) {
        return ResponseEntity.ok(sqaService.findExpiringSoon(days));
    }

    @GetMapping("/api/supplier-quality-agreements/suppliers-without-sqa")
    public ResponseEntity<List<SupplierResponse>> suppliersWithoutSqa() {
        return ResponseEntity.ok(sqaService.findSuppliersWithoutSqa());
    }

    @GetMapping("/api/supplier-quality-agreements/{id}")
    public ResponseEntity<Response> get(@PathVariable UUID id) {
        return ResponseEntity.ok(sqaService.get(id));
    }

    @PutMapping("/api/supplier-quality-agreements/{id}")
    public ResponseEntity<Response> update(@PathVariable UUID id, @Valid @RequestBody Request request) {
        return ResponseEntity.ok(sqaService.update(id, request));
    }

    @PutMapping("/api/supplier-quality-agreements/{id}/status")
    public ResponseEntity<Response> updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        return ResponseEntity.ok(sqaService.updateStatus(id, request));
    }

    @GetMapping("/api/suppliers/{id}/quality-agreements")
    public ResponseEntity<List<Response>> bySupplier(@PathVariable UUID id) {
        return ResponseEntity.ok(sqaService.findBySupplier(id));
    }
}
