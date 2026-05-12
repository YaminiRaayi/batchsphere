package com.batchsphere.core.qms.document.service;

import com.batchsphere.core.qms.document.dto.ControlledDocumentResponse;
import com.batchsphere.core.qms.document.dto.CreateControlledDocumentRequest;
import com.batchsphere.core.qms.document.dto.CreateDocumentRevisionRequest;
import com.batchsphere.core.qms.document.dto.DocumentApprovalRequest;
import com.batchsphere.core.qms.document.dto.DocumentRevisionResponse;
import com.batchsphere.core.qms.document.entity.ControlledDocumentStatus;
import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ControlledDocumentService {
    ControlledDocumentResponse createDocument(CreateControlledDocumentRequest request);

    Page<ControlledDocumentResponse> getDocuments(ControlledDocumentType type,
                                                  ControlledDocumentStatus status,
                                                  String search,
                                                  Pageable pageable);

    ControlledDocumentResponse getDocument(UUID id);

    DocumentRevisionResponse createRevision(UUID documentId, CreateDocumentRevisionRequest request, MultipartFile file);

    ControlledDocumentResponse submitRevision(UUID documentId, UUID revisionId);

    ControlledDocumentResponse approveRevision(UUID documentId, UUID revisionId, DocumentApprovalRequest request);

    Resource loadRevisionFile(UUID documentId, UUID revisionId);
}
