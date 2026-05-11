package com.batchsphere.core.masterdata.supplier.controller;

import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierRequest;
import com.batchsphere.core.masterdata.supplier.dto.supplier.dto.SupplierResponse;
import com.batchsphere.core.masterdata.supplier.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    public ResponseEntity<SupplierResponse> createSupplier(@Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(supplierService.createSupplier(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupplierResponse> getSupplier(@PathVariable UUID id) {
        return ResponseEntity.ok(supplierService.getSupplier(id));
    }

    @GetMapping
    public ResponseEntity<List<SupplierResponse>> getAllSuppliers() {
        return ResponseEntity.ok(supplierService.getAllSuppliers());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierResponse> updateSupplier(@PathVariable UUID id, @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateSupplier(@PathVariable UUID id) {
        supplierService.deactivateSupplier(id);
        return ResponseEntity.noContent().build();
    }
}
