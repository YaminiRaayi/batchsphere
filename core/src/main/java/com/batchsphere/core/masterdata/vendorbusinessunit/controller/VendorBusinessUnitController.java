package com.batchsphere.core.masterdata.vendorbusinessunit.controller;

import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.UpdateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.service.VendorBusinessUnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VendorBusinessUnitController {

    private final VendorBusinessUnitService vendorBusinessUnitService;

    @PostMapping("/vendors/{vendorId}/business-units")
    public ResponseEntity<VendorBusinessUnit> createVendorBusinessUnit(
            @PathVariable UUID vendorId,
            @Valid @RequestBody CreateVendorBusinessUnitRequest request) {
        return ResponseEntity.ok(vendorBusinessUnitService.createVendorBusinessUnit(vendorId, request));
    }

    @GetMapping("/vendor-business-units/{id}")
    public ResponseEntity<VendorBusinessUnit> getVendorBusinessUnitById(@PathVariable UUID id) {
        return ResponseEntity.ok(vendorBusinessUnitService.getVendorBusinessUnitById(id));
    }

    @GetMapping("/vendor-business-units")
    public ResponseEntity<Page<VendorBusinessUnit>> getAllVendorBusinessUnits(
            @RequestParam(required = false) UUID vendorId,
            Pageable pageable) {
        return ResponseEntity.ok(vendorBusinessUnitService.getAllVendorBusinessUnits(vendorId, pageable));
    }

    @GetMapping("/vendors/{vendorId}/business-units")
    public ResponseEntity<Page<VendorBusinessUnit>> getVendorBusinessUnitsByVendorId(
            @PathVariable UUID vendorId,
            Pageable pageable) {
        return ResponseEntity.ok(vendorBusinessUnitService.getAllVendorBusinessUnits(vendorId, pageable));
    }

    @PutMapping("/vendors/{vendorId}/business-units/{id}")
    public ResponseEntity<VendorBusinessUnit> updateVendorBusinessUnit(
            @PathVariable UUID vendorId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVendorBusinessUnitRequest request) {
        return ResponseEntity.ok(vendorBusinessUnitService.updateVendorBusinessUnit(vendorId, id, request));
    }

    @DeleteMapping("/vendor-business-units/{id}")
    public ResponseEntity<Void> deactivateVendorBusinessUnit(@PathVariable UUID id) {
        vendorBusinessUnitService.deactivateVendorBusinessUnit(id);
        return ResponseEntity.noContent().build();
    }
}
