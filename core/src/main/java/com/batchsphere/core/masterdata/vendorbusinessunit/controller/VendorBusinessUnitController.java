package com.batchsphere.core.masterdata.vendorbusinessunit.controller;

import com.batchsphere.core.masterdata.vendorbusinessunit.dto.CreateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.UpdateVendorBusinessUnitRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditRequest;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorAuditResponse;
import com.batchsphere.core.masterdata.vendorbusinessunit.dto.VendorDocumentResponse;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.service.VendorBusinessUnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
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

    @PatchMapping("/vendor-business-units/{id}/qualification")
    public ResponseEntity<VendorBusinessUnit> updateQualificationStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVendorBusinessUnitRequest request) {
        VendorBusinessUnit existing = vendorBusinessUnitService.getVendorBusinessUnitById(id);
        return ResponseEntity.ok(vendorBusinessUnitService.updateVendorBusinessUnit(existing.getVendorId(), id, request));
    }

    @DeleteMapping("/vendor-business-units/{id}")
    public ResponseEntity<Void> deactivateVendorBusinessUnit(@PathVariable UUID id) {
        vendorBusinessUnitService.deactivateVendorBusinessUnit(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/vendor-business-units/{id}/documents")
    public ResponseEntity<List<VendorDocumentResponse>> getVendorDocuments(@PathVariable UUID id) {
        return ResponseEntity.ok(vendorBusinessUnitService.getVendorDocuments(id));
    }

    @PostMapping("/vendor-business-units/{id}/documents")
    public ResponseEntity<VendorDocumentResponse> uploadVendorDocument(
            @PathVariable UUID id,
            @RequestParam String documentTitle,
            @RequestParam String documentType,
            @RequestParam(required = false) LocalDate expiryDate,
            @RequestParam MultipartFile file) {
        return ResponseEntity.ok(
                vendorBusinessUnitService.uploadVendorDocument(id, documentTitle, documentType, expiryDate, file)
        );
    }

    @DeleteMapping("/vendor-business-units/{id}/documents/{documentId}")
    public ResponseEntity<Void> deleteVendorDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        vendorBusinessUnitService.deleteVendorDocument(id, documentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/vendor-business-units/{id}/documents/{documentId}/file")
    public ResponseEntity<Resource> downloadVendorDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        Resource resource = vendorBusinessUnitService.loadVendorDocumentFile(id, documentId);
        MediaType contentType = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/vendor-business-units/{id}/audits")
    public ResponseEntity<List<VendorAuditResponse>> getVendorAudits(@PathVariable UUID id) {
        return ResponseEntity.ok(vendorBusinessUnitService.getVendorAudits(id));
    }

    @PostMapping("/vendor-business-units/{id}/audits")
    public ResponseEntity<VendorAuditResponse> createVendorAudit(
            @PathVariable UUID id,
            @Valid @RequestBody VendorAuditRequest request) {
        return ResponseEntity.ok(vendorBusinessUnitService.createVendorAudit(id, request));
    }

    @PutMapping("/vendor-business-units/{id}/audits/{auditId}")
    public ResponseEntity<VendorAuditResponse> updateVendorAudit(
            @PathVariable UUID id,
            @PathVariable UUID auditId,
            @Valid @RequestBody VendorAuditRequest request) {
        return ResponseEntity.ok(vendorBusinessUnitService.updateVendorAudit(id, auditId, request));
    }
}
