package com.batchsphere.core.qms.riskassessment.dto;

import com.batchsphere.core.qms.riskassessment.entity.RiskAssessmentScope;
import com.batchsphere.core.qms.riskassessment.entity.RiskAssessmentStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class RiskAssessmentResponse {
    UUID id;
    String assessmentNumber;
    String title;
    RiskAssessmentScope scope;
    String scopeEntityType;
    UUID scopeEntityId;
    String scopeEntityDisplay;
    RiskAssessmentStatus status;
    String methodology;
    String preparedBy;
    String reviewedBy;
    String acceptedBy;
    OffsetDateTime acceptedAt;
    UUID acceptanceESignatureId;
    LocalDate nextReviewDate;
    Boolean residualRiskAcceptable;
    String overallRiskConclusion;
    int highRpnItemsCount;
    int criticalItemsCount;
    List<RiskItemResponse> items;
    Boolean isActive;
    String createdBy;
    OffsetDateTime createdAt;
    String updatedBy;
    OffsetDateTime updatedAt;
}
