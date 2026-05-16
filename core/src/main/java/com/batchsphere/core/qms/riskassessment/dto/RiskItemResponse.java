package com.batchsphere.core.qms.riskassessment.dto;

import com.batchsphere.core.qms.riskassessment.entity.RiskControlType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Value
@Builder
public class RiskItemResponse {
    UUID id;
    UUID riskAssessmentId;
    int sequenceNumber;
    String processStep;
    String failureMode;
    String failureEffect;
    String failureCause;
    String currentControls;
    int probability;
    int severity;
    int detectability;
    int rpn;
    RiskControlType riskControlType;
    String proposedAction;
    String actionOwner;
    LocalDate actionDueDate;
    UUID linkedCapaId;
    Integer residualProbability;
    Integer residualSeverity;
    Integer residualDetectability;
    int residualRpn;
    boolean highRpn;
    boolean critical;
    Boolean isActive;
    String createdBy;
    OffsetDateTime createdAt;
    String updatedBy;
    OffsetDateTime updatedAt;
}
