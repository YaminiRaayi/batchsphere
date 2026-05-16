package com.batchsphere.core.qms.riskassessment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRiskAssessmentRequest {

    @NotBlank
    private String title;

    private String scopeEntityType;
    private UUID scopeEntityId;
    private String scopeEntityDisplay;
    private String methodology;
    private LocalDate nextReviewDate;
    private String reviewedBy;
    private Boolean residualRiskAcceptable;
    private String overallRiskConclusion;
}
