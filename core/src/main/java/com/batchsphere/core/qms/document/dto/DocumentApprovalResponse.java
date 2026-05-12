package com.batchsphere.core.qms.document.dto;

import com.batchsphere.core.qms.document.entity.DocumentApprovalStatus;
import com.batchsphere.core.qms.document.entity.DocumentApprovalStep;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class DocumentApprovalResponse {
    UUID id;
    UUID revisionId;
    DocumentApprovalStep approvalStep;
    String approverRole;
    DocumentApprovalStatus status;
    String comments;
    String approvedBy;
    LocalDateTime approvedAt;
    UUID eSignatureId;
}
