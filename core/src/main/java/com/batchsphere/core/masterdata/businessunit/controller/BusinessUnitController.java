package com.batchsphere.core.masterdata.businessunit.controller;

import com.batchsphere.core.masterdata.businessunit.dto.CreateBusinessUnitRequest;
import com.batchsphere.core.masterdata.businessunit.dto.UpdateBusinessUnitRequest;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import com.batchsphere.core.masterdata.businessunit.service.BusinessUnitService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/business-units")
@RequiredArgsConstructor
public class BusinessUnitController {

    private final BusinessUnitService businessUnitService;

    @PostMapping
    public ResponseEntity<BusinessUnit> createBusinessUnit(@Valid @RequestBody CreateBusinessUnitRequest request) {
        return ResponseEntity.ok(businessUnitService.createBusinessUnit(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusinessUnit> getBusinessUnitById(@PathVariable UUID id) {
        return ResponseEntity.ok(businessUnitService.getBusinessUnitById(id));
    }

    @GetMapping
    public ResponseEntity<Page<BusinessUnit>> getAllBusinessUnits(Pageable pageable) {
        return ResponseEntity.ok(businessUnitService.getAllBusinessUnits(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusinessUnit> updateBusinessUnit(@PathVariable UUID id, @Valid @RequestBody UpdateBusinessUnitRequest request) {
        return ResponseEntity.ok(businessUnitService.updateBusinessUnit(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateBusinessUnit(@PathVariable UUID id) {
        businessUnitService.deactivateBusinessUnit(id);
        return ResponseEntity.noContent().build();
    }
}
