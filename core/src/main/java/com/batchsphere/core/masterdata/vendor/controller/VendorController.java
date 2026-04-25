package com.batchsphere.core.masterdata.vendor.controller;

import com.batchsphere.core.masterdata.vendor.dto.VendorApprovalRequest;
import com.batchsphere.core.masterdata.vendor.dto.VendorDocumentResponse;
import com.batchsphere.core.masterdata.vendor.dto.VendorRequest;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.service.VendorService;
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
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @PostMapping
    public ResponseEntity<Vendor> createVendor(@Valid @RequestBody VendorRequest request) {
        return ResponseEntity.ok(vendorService.createVendor(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Vendor> getVendorById(@PathVariable UUID id) {
        return ResponseEntity.ok(vendorService.getVendorById(id));
    }

    @GetMapping
    public ResponseEntity<Page<Vendor>> getAllVendors(Pageable pageable) {
        return ResponseEntity.ok(vendorService.getAllVendors(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Vendor> updateVendor(@PathVariable UUID id, @Valid @RequestBody VendorRequest request) {
        return ResponseEntity.ok(vendorService.updateVendor(id, request));
    }

    @PatchMapping("/{id}/approval")
    public ResponseEntity<Vendor> updateVendorApproval(
            @PathVariable UUID id,
            @Valid @RequestBody VendorApprovalRequest request) {
        return ResponseEntity.ok(vendorService.updateVendorApproval(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateVendor(@PathVariable UUID id) {
        vendorService.deactivateVendor(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<VendorDocumentResponse>> getVendorDocuments(@PathVariable UUID id) {
        return ResponseEntity.ok(vendorService.getVendorDocuments(id));
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<VendorDocumentResponse> uploadVendorDocument(
            @PathVariable UUID id,
            @RequestParam String documentTitle,
            @RequestParam String documentType,
            @RequestParam(required = false) LocalDate expiryDate,
            @RequestParam MultipartFile file) {
        return ResponseEntity.ok(vendorService.uploadVendorDocument(id, documentTitle, documentType, expiryDate, file));
    }

    @DeleteMapping("/{id}/documents/{documentId}")
    public ResponseEntity<Void> deleteVendorDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        vendorService.deleteVendorDocument(id, documentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/documents/{documentId}/file")
    public ResponseEntity<Resource> downloadVendorDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        Resource resource = vendorService.loadVendorDocumentFile(id, documentId);
        MediaType contentType = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
