package com.batchsphere.core.qms.document.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.qms.document.dto.ControlledDocumentResponse;
import com.batchsphere.core.qms.document.dto.CreateControlledDocumentRequest;
import com.batchsphere.core.qms.document.dto.CreateDocumentRevisionRequest;
import com.batchsphere.core.qms.document.dto.DocumentApprovalRequest;
import com.batchsphere.core.qms.document.dto.DocumentApprovalResponse;
import com.batchsphere.core.qms.document.dto.DocumentRevisionResponse;
import com.batchsphere.core.qms.document.entity.ControlledDocument;
import com.batchsphere.core.qms.document.entity.ControlledDocumentStatus;
import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import com.batchsphere.core.qms.document.entity.DocumentApproval;
import com.batchsphere.core.qms.document.entity.DocumentApprovalStatus;
import com.batchsphere.core.qms.document.entity.DocumentApprovalStep;
import com.batchsphere.core.qms.document.entity.DocumentRevision;
import com.batchsphere.core.qms.document.entity.DocumentRevisionStatus;
import com.batchsphere.core.qms.document.repository.ControlledDocumentRepository;
import com.batchsphere.core.qms.document.repository.DocumentApprovalRepository;
import com.batchsphere.core.qms.document.repository.DocumentRevisionRepository;
import com.batchsphere.core.storage.LocalStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ControlledDocumentServiceImpl implements ControlledDocumentService {

    private final ControlledDocumentRepository documentRepository;
    private final DocumentRevisionRepository revisionRepository;
    private final DocumentApprovalRepository approvalRepository;
    private final LocalStorageService localStorageService;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public ControlledDocumentResponse createDocument(CreateControlledDocumentRequest request) {
        String documentNumber = trimRequired(request.getDocumentNumber(), "Document number is required");
        if (documentRepository.existsByDocumentNumber(documentNumber)) {
            throw new BusinessConflictException("Document number already exists");
        }
        String actor = authenticatedActorService.currentActor();
        LocalDateTime now = LocalDateTime.now();
        ControlledDocument document = ControlledDocument.builder()
                .id(UUID.randomUUID())
                .documentNumber(documentNumber)
                .title(trimRequired(request.getTitle(), "Document title is required"))
                .documentType(request.getDocumentType())
                .category(blankToNull(request.getCategory()))
                .department(trimRequired(request.getDepartment(), "Department is required"))
                .status(ControlledDocumentStatus.DRAFT)
                .linkedMaterialCode(blankToNull(request.getLinkedMaterialCode()))
                .linkedMoaCode(blankToNull(request.getLinkedMoaCode()))
                .reviewCycleMonths(resolveReviewCycleMonths(request.getReviewCycleMonths()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();
        ControlledDocument savedDocument = documentRepository.save(document);
        DocumentRevision revision = revisionRepository.save(DocumentRevision.builder()
                .id(UUID.randomUUID())
                .documentId(savedDocument.getId())
                .revision("v1.0")
                .revisionStatus(DocumentRevisionStatus.DRAFT)
                .changeSummary(trimRequired(request.getChangeSummary(), "Change summary is required"))
                .createdBy(actor)
                .createdAt(now)
                .build());
        createApprovalChecklist(revision.getId());
        auditEventService.record("CONTROLLED_DOCUMENT", savedDocument.getId(), AuditEventType.CREATE, "status",
                null, savedDocument.getStatus().name(), "Controlled document created", actor, "DOCUMENT_CONTROL");
        return toResponse(savedDocument);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ControlledDocumentResponse> getDocuments(ControlledDocumentType type,
                                                         ControlledDocumentStatus status,
                                                         String search,
                                                         Pageable pageable) {
        String normalizedSearch = StringUtils.hasText(search) ? search.trim() : null;
        return documentRepository.search(type, status, normalizedSearch, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ControlledDocumentResponse getDocument(UUID id) {
        return toResponse(getActiveDocument(id));
    }

    @Override
    @Transactional
    public DocumentRevisionResponse createRevision(UUID documentId, CreateDocumentRevisionRequest request, MultipartFile file) {
        ControlledDocument document = getActiveDocument(documentId);
        if (document.getStatus() == ControlledDocumentStatus.IN_REVIEW) {
            throw new BusinessConflictException("Cannot create a new revision while a revision is in review");
        }
        String actor = authenticatedActorService.currentActor();
        String storagePath = null;
        String fileName = null;
        if (file != null && !file.isEmpty()) {
            storagePath = localStorageService.store("controlled-document", documentId + "/revisions", file);
            fileName = file.getOriginalFilename();
        }
        DocumentRevision revision = revisionRepository.save(DocumentRevision.builder()
                .id(UUID.randomUUID())
                .documentId(documentId)
                .revision(trimRequired(request.getRevision(), "Revision is required"))
                .revisionStatus(DocumentRevisionStatus.DRAFT)
                .changeSummary(trimRequired(request.getChangeSummary(), "Change summary is required"))
                .fileName(fileName)
                .storagePath(storagePath)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build());
        createApprovalChecklist(revision.getId());
        document.setStatus(ControlledDocumentStatus.DRAFT);
        document.setUpdatedBy(actor);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
        auditEventService.record("CONTROLLED_DOCUMENT", documentId, AuditEventType.UPDATE, "revision",
                null, revision.getRevision(), "New revision created", actor, "DOCUMENT_CONTROL");
        return toRevisionResponse(revision);
    }

    @Override
    @Transactional
    public ControlledDocumentResponse submitRevision(UUID documentId, UUID revisionId) {
        ControlledDocument document = getActiveDocument(documentId);
        DocumentRevision revision = getRevision(documentId, revisionId);
        if (revision.getRevisionStatus() != DocumentRevisionStatus.DRAFT) {
            throw new BusinessConflictException("Only draft revisions can be submitted");
        }
        String actor = authenticatedActorService.currentActor();
        revision.setRevisionStatus(DocumentRevisionStatus.IN_REVIEW);
        revision.setSubmittedBy(actor);
        revision.setSubmittedAt(LocalDateTime.now());
        revisionRepository.save(revision);
        document.setStatus(ControlledDocumentStatus.IN_REVIEW);
        document.setUpdatedBy(actor);
        document.setUpdatedAt(LocalDateTime.now());
        ControlledDocument saved = documentRepository.save(document);
        auditEventService.record("CONTROLLED_DOCUMENT", documentId, AuditEventType.STATUS_CHANGE, "status",
                ControlledDocumentStatus.DRAFT.name(), ControlledDocumentStatus.IN_REVIEW.name(), "Revision submitted for approval", actor, "DOCUMENT_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ControlledDocumentResponse approveRevision(UUID documentId, UUID revisionId, DocumentApprovalRequest request) {
        ControlledDocument document = getActiveDocument(documentId);
        DocumentRevision revision = getRevision(documentId, revisionId);
        if (revision.getRevisionStatus() != DocumentRevisionStatus.IN_REVIEW) {
            throw new BusinessConflictException("Revision must be in review before approval");
        }
        DocumentApproval approval = approvalRepository.findByRevisionIdOrderByApprovalStepAsc(revisionId)
                .stream()
                .filter(item -> item.getStatus() == DocumentApprovalStatus.PENDING)
                .sorted((left, right) -> Integer.compare(approvalOrder(left.getApprovalStep()), approvalOrder(right.getApprovalStep())))
                .findFirst()
                .orElseThrow(() -> new BusinessConflictException("No pending approval step found"));
        String actor = authenticatedActorService.currentActor();
        ESignatureRequest signatureRequest = new ESignatureRequest();
        signatureRequest.setUsername(request.getUsername());
        signatureRequest.setPassword(request.getPassword());
        signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning()) ? request.getMeaning() : "I approve this controlled document revision");
        ESignatureRecordResponse signature = eSignatureService.sign(
                "CONTROLLED_DOCUMENT_REVISION",
                revisionId,
                approval.getApprovalStep().name(),
                "I approve this controlled document revision",
                actor,
                signatureRequest,
                request.getComments()
        );

        approval.setStatus(DocumentApprovalStatus.APPROVED);
        approval.setComments(blankToNull(request.getComments()));
        approval.setApprovedBy(actor);
        approval.setApprovedAt(LocalDateTime.now());
        approval.setESignatureId(signature.getId());
        approvalRepository.save(approval);

        auditEventService.record("CONTROLLED_DOCUMENT", documentId, AuditEventType.WORKFLOW_ACTION, approval.getApprovalStep().name(),
                DocumentApprovalStatus.PENDING.name(), DocumentApprovalStatus.APPROVED.name(), request.getComments(), actor, "DOCUMENT_CONTROL");

        boolean allApproved = approvalRepository.findByRevisionIdOrderByApprovalStepAsc(revisionId)
                .stream()
                .allMatch(item -> item.getStatus() == DocumentApprovalStatus.APPROVED);
        if (allApproved) {
            activateRevision(document, revision, actor);
        } else {
            document.setUpdatedBy(actor);
            document.setUpdatedAt(LocalDateTime.now());
            documentRepository.save(document);
        }
        return toResponse(documentRepository.findByIdAndIsActiveTrue(documentId).orElseThrow());
    }

    @Override
    @Transactional(readOnly = true)
    public Resource loadRevisionFile(UUID documentId, UUID revisionId) {
        DocumentRevision revision = getRevision(documentId, revisionId);
        if (!StringUtils.hasText(revision.getStoragePath())) {
            throw new ResourceNotFoundException("Document revision file not found");
        }
        return localStorageService.loadAsResource(revision.getStoragePath());
    }

    private void activateRevision(ControlledDocument document, DocumentRevision revision, String actor) {
        LocalDateTime now = LocalDateTime.now();
        if (document.getCurrentRevisionId() != null) {
            revisionRepository.findById(document.getCurrentRevisionId()).ifPresent(current -> {
                current.setRevisionStatus(DocumentRevisionStatus.SUPERSEDED);
                current.setSupersededAt(now);
                revisionRepository.save(current);
            });
        }
        LocalDate effectiveDate = LocalDate.now();
        revision.setRevisionStatus(DocumentRevisionStatus.APPROVED);
        revision.setApprovedBy(actor);
        revision.setApprovedAt(now);
        revision.setEffectiveDate(effectiveDate);
        revisionRepository.save(revision);
        document.setStatus(ControlledDocumentStatus.EFFECTIVE);
        document.setCurrentRevisionId(revision.getId());
        document.setEffectiveDate(effectiveDate);
        document.setNextReviewDate(effectiveDate.plusMonths(document.getReviewCycleMonths()));
        document.setUpdatedBy(actor);
        document.setUpdatedAt(now);
        documentRepository.save(document);
        auditEventService.record("CONTROLLED_DOCUMENT", document.getId(), AuditEventType.STATUS_CHANGE, "status",
                ControlledDocumentStatus.IN_REVIEW.name(), ControlledDocumentStatus.EFFECTIVE.name(), "Revision approved and made effective", actor, "DOCUMENT_CONTROL");
    }

    private void createApprovalChecklist(UUID revisionId) {
        approvalRepository.save(DocumentApproval.builder()
                .id(UUID.randomUUID())
                .revisionId(revisionId)
                .approvalStep(DocumentApprovalStep.TECHNICAL_REVIEW)
                .approverRole("QC_MANAGER")
                .status(DocumentApprovalStatus.PENDING)
                .build());
        approvalRepository.save(DocumentApproval.builder()
                .id(UUID.randomUUID())
                .revisionId(revisionId)
                .approvalStep(DocumentApprovalStep.QA_APPROVAL)
                .approverRole("SUPER_ADMIN")
                .status(DocumentApprovalStatus.PENDING)
                .build());
    }

    private int approvalOrder(DocumentApprovalStep step) {
        return step == DocumentApprovalStep.TECHNICAL_REVIEW ? 1 : 2;
    }

    private ControlledDocument getActiveDocument(UUID id) {
        return documentRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Controlled document not found: " + id));
    }

    private DocumentRevision getRevision(UUID documentId, UUID revisionId) {
        return revisionRepository.findByIdAndDocumentId(revisionId, documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document revision not found: " + revisionId));
    }

    private ControlledDocumentResponse toResponse(ControlledDocument document) {
        List<DocumentRevisionResponse> revisions = revisionRepository.findByDocumentIdOrderByCreatedAtDesc(document.getId())
                .stream()
                .map(this::toRevisionResponse)
                .toList();
        DocumentRevisionResponse currentRevision = revisions.stream()
                .filter(revision -> revision.getId().equals(document.getCurrentRevisionId()))
                .findFirst()
                .orElse(revisions.isEmpty() ? null : revisions.get(0));
        return ControlledDocumentResponse.builder()
                .id(document.getId())
                .documentNumber(document.getDocumentNumber())
                .title(document.getTitle())
                .documentType(document.getDocumentType())
                .category(document.getCategory())
                .department(document.getDepartment())
                .status(document.getStatus())
                .currentRevisionId(document.getCurrentRevisionId())
                .linkedMaterialCode(document.getLinkedMaterialCode())
                .linkedMoaCode(document.getLinkedMoaCode())
                .reviewCycleMonths(document.getReviewCycleMonths())
                .nextReviewDate(document.getNextReviewDate())
                .effectiveDate(document.getEffectiveDate())
                .isActive(document.getIsActive())
                .createdBy(document.getCreatedBy())
                .createdAt(document.getCreatedAt())
                .updatedBy(document.getUpdatedBy())
                .updatedAt(document.getUpdatedAt())
                .currentRevision(currentRevision)
                .revisions(revisions)
                .build();
    }

    private DocumentRevisionResponse toRevisionResponse(DocumentRevision revision) {
        return DocumentRevisionResponse.builder()
                .id(revision.getId())
                .documentId(revision.getDocumentId())
                .revision(revision.getRevision())
                .revisionStatus(revision.getRevisionStatus())
                .changeSummary(revision.getChangeSummary())
                .fileName(revision.getFileName())
                .storagePath(revision.getStoragePath())
                .effectiveDate(revision.getEffectiveDate())
                .supersededAt(revision.getSupersededAt())
                .createdBy(revision.getCreatedBy())
                .createdAt(revision.getCreatedAt())
                .submittedBy(revision.getSubmittedBy())
                .submittedAt(revision.getSubmittedAt())
                .approvedBy(revision.getApprovedBy())
                .approvedAt(revision.getApprovedAt())
                .approvals(approvalRepository.findByRevisionIdOrderByApprovalStepAsc(revision.getId()).stream()
                        .map(this::toApprovalResponse)
                        .toList())
                .build();
    }

    private DocumentApprovalResponse toApprovalResponse(DocumentApproval approval) {
        return DocumentApprovalResponse.builder()
                .id(approval.getId())
                .revisionId(approval.getRevisionId())
                .approvalStep(approval.getApprovalStep())
                .approverRole(approval.getApproverRole())
                .status(approval.getStatus())
                .comments(approval.getComments())
                .approvedBy(approval.getApprovedBy())
                .approvedAt(approval.getApprovedAt())
                .eSignatureId(approval.getESignatureId())
                .build();
    }

    private String trimRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessConflictException(message);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private int resolveReviewCycleMonths(Integer value) {
        if (value == null) {
            return 24;
        }
        if (value < 1) {
            throw new BusinessConflictException("Review cycle must be at least 1 month");
        }
        return value;
    }
}
