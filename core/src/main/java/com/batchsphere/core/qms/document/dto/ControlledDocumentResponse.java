package com.batchsphere.core.qms.document.dto;

import com.batchsphere.core.qms.document.entity.ControlledDocumentStatus;
import com.batchsphere.core.qms.document.entity.ControlledDocumentType;
import com.batchsphere.core.qms.document.entity.DocumentReviewStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class ControlledDocumentResponse {
    UUID id;
    String documentNumber;
    String title;
    ControlledDocumentType documentType;
    String category;
    String department;
    ControlledDocumentStatus status;
    UUID currentRevisionId;
    String linkedMaterialCode;
    String linkedMoaCode;
    Integer reviewCycleMonths;
    LocalDate nextReviewDate;
    DocumentReviewStatus reviewStatus;
    LocalDate effectiveDate;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    DocumentRevisionResponse currentRevision;
    List<DocumentRevisionResponse> revisions;
}
