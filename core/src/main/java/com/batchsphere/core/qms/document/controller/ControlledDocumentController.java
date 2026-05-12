package com.batchsphere.core.qms.document.controller;

import com.batchsphere.core.qms.document.dto.ControlledDocumentResponse;
import com.batchsphere.core.qms.document.dto.CreateControlledDocumentRequest;
import com.batchsphere.core.qms.document.dto.CreateDocumentDistributionRequest;
import com.batchsphere.core.qms.document.dto.CreateDocumentRevisionRequest;
import com.batchsphere.core.qms.document.dto.DocumentAcknowledgementRequest;
import com.batchsphere.core.qms.document.dto.DocumentApprovalRequest;
import com.batchsphere.core.qms.document.dto.DocumentDistributionResponse;
import com.batchsphere.core.qms.document.dto.DocumentRevisionResponse;
import com.batchsphere.core.qms.document.entity.ControlledDocumentStatus;
import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import com.batchsphere.core.qms.document.service.ControlledDocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class ControlledDocumentController {

    private final ControlledDocumentService documentService;

    @PostMapping
    public ResponseEntity<ControlledDocumentResponse> createDocument(@Valid @RequestBody CreateControlledDocumentRequest request) {
        return ResponseEntity.ok(documentService.createDocument(request));
    }

    @GetMapping
    public ResponseEntity<Page<ControlledDocumentResponse>> getDocuments(@RequestParam(required = false) ControlledDocumentType type,
                                                                         @RequestParam(required = false) ControlledDocumentStatus status,
                                                                         @RequestParam(required = false) String search,
                                                                         Pageable pageable) {
        return ResponseEntity.ok(documentService.getDocuments(type, status, search, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ControlledDocumentResponse> getDocument(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getDocument(id));
    }

    @PostMapping("/{id}/revisions")
    public ResponseEntity<DocumentRevisionResponse> createRevision(@PathVariable UUID id,
                                                                   @RequestParam String revision,
                                                                   @RequestParam String changeSummary,
                                                                   @RequestParam(required = false) MultipartFile file) {
        CreateDocumentRevisionRequest request = new CreateDocumentRevisionRequest();
        request.setRevision(revision);
        request.setChangeSummary(changeSummary);
        return ResponseEntity.ok(documentService.createRevision(id, request, file));
    }

    @PostMapping("/{id}/revisions/{revisionId}/submit")
    public ResponseEntity<ControlledDocumentResponse> submitRevision(@PathVariable UUID id, @PathVariable UUID revisionId) {
        return ResponseEntity.ok(documentService.submitRevision(id, revisionId));
    }

    @PostMapping("/{id}/revisions/{revisionId}/approvals")
    public ResponseEntity<ControlledDocumentResponse> approveRevision(@PathVariable UUID id,
                                                                      @PathVariable UUID revisionId,
                                                                      @Valid @RequestBody DocumentApprovalRequest request) {
        return ResponseEntity.ok(documentService.approveRevision(id, revisionId, request));
    }

    @PostMapping("/{id}/revisions/{revisionId}/distributions")
    public ResponseEntity<List<DocumentDistributionResponse>> distributeRevision(@PathVariable UUID id,
                                                                                @PathVariable UUID revisionId,
                                                                                @Valid @RequestBody CreateDocumentDistributionRequest request) {
        return ResponseEntity.ok(documentService.distributeRevision(id, revisionId, request));
    }

    @GetMapping("/{id}/distributions")
    public ResponseEntity<List<DocumentDistributionResponse>> getDocumentDistributions(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.getDocumentDistributions(id));
    }

    @GetMapping("/my-acknowledgements")
    public ResponseEntity<List<DocumentDistributionResponse>> getMyAcknowledgements() {
        return ResponseEntity.ok(documentService.getMyAcknowledgements());
    }

    @PostMapping("/distributions/{distributionId}/acknowledge")
    public ResponseEntity<DocumentDistributionResponse> acknowledgeDistribution(@PathVariable UUID distributionId,
                                                                               @Valid @RequestBody DocumentAcknowledgementRequest request) {
        return ResponseEntity.ok(documentService.acknowledgeDistribution(distributionId, request));
    }

    @GetMapping("/{id}/revisions/{revisionId}/file")
    public ResponseEntity<Resource> downloadRevisionFile(@PathVariable UUID id, @PathVariable UUID revisionId) {
        return ResponseEntity.ok(documentService.loadRevisionFile(id, revisionId));
    }
}
