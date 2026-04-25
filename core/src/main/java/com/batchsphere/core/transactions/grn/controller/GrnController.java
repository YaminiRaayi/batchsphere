package com.batchsphere.core.transactions.grn.controller;

import com.batchsphere.core.transactions.grn.dto.CreateGrnRequest;
import com.batchsphere.core.transactions.grn.dto.ContainerSamplingLabelRequest;
import com.batchsphere.core.transactions.grn.dto.GrnContainerResponse;
import com.batchsphere.core.transactions.grn.dto.GrnDocumentResponse;
import com.batchsphere.core.transactions.grn.dto.GrnDocumentUploadRequest;
import com.batchsphere.core.transactions.grn.dto.GrnLabelPrintDataResponse;
import com.batchsphere.core.transactions.grn.dto.GrnResponse;
import com.batchsphere.core.transactions.grn.dto.GrnSummaryResponse;
import com.batchsphere.core.transactions.grn.dto.GrnStatusUpdateRequest;
import com.batchsphere.core.transactions.grn.dto.MaterialLabelResponse;
import com.batchsphere.core.transactions.grn.dto.UpdateGrnRequest;
import com.batchsphere.core.transactions.grn.service.GrnService;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/grns")
@RequiredArgsConstructor
public class GrnController {

    private final GrnService grnService;

    @PostMapping
    public ResponseEntity<GrnResponse> createGrn(@Valid @RequestBody CreateGrnRequest request) {
        return ResponseEntity.ok(grnService.createGrn(request));
    }

    @GetMapping("/summary")
    public ResponseEntity<GrnSummaryResponse> getGrnSummary() {
        return ResponseEntity.ok(grnService.getGrnSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GrnResponse> getGrnById(@PathVariable UUID id) {
        return ResponseEntity.ok(grnService.getGrnById(id));
    }

    @GetMapping
    public ResponseEntity<Page<GrnResponse>> getAllGrns(Pageable pageable,
                                                        @RequestParam(required = false) UUID vendorId) {
        if (vendorId != null) {
            return ResponseEntity.ok(grnService.getGrnsByVendor(vendorId, pageable));
        }
        return ResponseEntity.ok(grnService.getAllGrns(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GrnResponse> updateGrn(@PathVariable UUID id, @Valid @RequestBody UpdateGrnRequest request) {
        return ResponseEntity.ok(grnService.updateGrn(id, request));
    }

    @PostMapping("/{id}/receive")
    public ResponseEntity<GrnResponse> receiveGrn(@PathVariable UUID id, @Valid @RequestBody GrnStatusUpdateRequest request) {
        return ResponseEntity.ok(grnService.receiveGrn(id, request.getUpdatedBy()));
    }

    @GetMapping("/items/{grnItemId}/containers")
    public ResponseEntity<List<GrnContainerResponse>> getContainersByGrnItemId(@PathVariable UUID grnItemId) {
        return ResponseEntity.ok(grnService.getContainersByGrnItemId(grnItemId));
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<GrnDocumentResponse>> getDocumentsByGrnId(@PathVariable UUID id) {
        return ResponseEntity.ok(grnService.getDocumentsByGrnId(id));
    }

    @GetMapping("/{id}/labels")
    public ResponseEntity<List<MaterialLabelResponse>> getLabelsByGrnId(@PathVariable UUID id) {
        return ResponseEntity.ok(grnService.getLabelsByGrnId(id));
    }

    @GetMapping("/containers/{containerId}/labels")
    public ResponseEntity<List<MaterialLabelResponse>> getLabelsByContainerId(@PathVariable UUID containerId) {
        return ResponseEntity.ok(grnService.getLabelsByContainerId(containerId));
    }

    @GetMapping("/{id}/labels/print-data")
    public ResponseEntity<GrnLabelPrintDataResponse> getLabelPrintData(@PathVariable UUID id) {
        return ResponseEntity.ok(grnService.getLabelPrintData(id));
    }

    @PostMapping("/containers/{containerId}/sampling-label")
    public ResponseEntity<GrnContainerResponse> applySamplingLabel(@PathVariable UUID containerId, @Valid @RequestBody ContainerSamplingLabelRequest request) {
        return ResponseEntity.ok(grnService.applySamplingLabel(containerId, request));
    }

    @PostMapping("/items/{grnItemId}/documents")
    public ResponseEntity<GrnDocumentResponse> uploadDocument(@PathVariable UUID grnItemId,
                                                              @RequestParam String documentName,
                                                              @RequestParam String documentType,
                                                              @RequestParam(required = false) String documentUrl,
                                                              @RequestParam(required = false) String createdBy,
                                                              @RequestParam MultipartFile file) {
        GrnDocumentUploadRequest request = new GrnDocumentUploadRequest();
        request.setDocumentName(documentName);
        request.setDocumentType(documentType);
        request.setDocumentUrl(documentUrl);
        request.setCreatedBy(createdBy);
        return ResponseEntity.ok(grnService.uploadDocument(grnItemId, request, file));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<GrnResponse> cancelGrn(@PathVariable UUID id, @Valid @RequestBody GrnStatusUpdateRequest request) {
        return ResponseEntity.ok(grnService.cancelGrn(id, request.getUpdatedBy(), request.getReason()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateGrn(@PathVariable UUID id, @RequestParam(required = false) String updatedBy) {
        grnService.deactivateGrn(id, updatedBy);
        return ResponseEntity.noContent().build();
    }
}
