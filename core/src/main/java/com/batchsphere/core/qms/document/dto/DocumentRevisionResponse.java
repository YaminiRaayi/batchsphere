package com.batchsphere.core.qms.document.dto;

import com.batchsphere.core.qms.document.entity.DocumentRevisionStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class DocumentRevisionResponse {
    UUID id;
    UUID documentId;
    String revision;
    DocumentRevisionStatus revisionStatus;
    String changeSummary;
    String fileName;
    String storagePath;
    LocalDate effectiveDate;
    LocalDateTime supersededAt;
    String createdBy;
    LocalDateTime createdAt;
    String submittedBy;
    LocalDateTime submittedAt;
    String approvedBy;
    LocalDateTime approvedAt;
    List<DocumentApprovalResponse> approvals;
}
