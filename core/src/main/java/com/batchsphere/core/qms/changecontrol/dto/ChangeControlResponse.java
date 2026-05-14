package com.batchsphere.core.qms.changecontrol.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class ChangeControlResponse {
    UUID id;
    String changeControlNumber;
    String title;
    String description;
    String changeType;
    String reason;
    String riskClassification;
    String status;
    String impactAssessment;
    String implementationPlan;
    String effectivenessCheck;
    String closureSummary;
    LocalDate targetCompletionDate;
    String submittedBy;
    LocalDateTime submittedAt;
    String approvedBy;
    LocalDateTime approvedAt;
    String approvalComments;
    UUID approvalESignatureId;
    String rejectedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    String closedBy;
    LocalDateTime closedAt;
    UUID closureESignatureId;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    List<ChangeControlAffectedEntityResponse> affectedEntities;
    List<ChangeControlTaskResponse> tasks;
}
