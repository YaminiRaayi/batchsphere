package com.batchsphere.core.qms.document.dto;

import com.batchsphere.core.qms.document.entity.DocumentDistributionStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class DocumentDistributionResponse {
    UUID id;
    UUID documentId;
    UUID revisionId;
    String documentNumber;
    String documentTitle;
    String revision;
    String assignedUsername;
    DocumentDistributionStatus status;
    LocalDate dueDate;
    String assignedBy;
    LocalDateTime assignedAt;
    String acknowledgedBy;
    LocalDateTime acknowledgedAt;
    UUID acknowledgementESignatureId;
    String comments;
    Boolean isActive;
}
