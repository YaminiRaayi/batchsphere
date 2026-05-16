package com.batchsphere.core.qms.riskassessment.dto;

import com.batchsphere.core.qms.riskassessment.entity.RiskAssessmentScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateRiskAssessmentRequest {

    @NotBlank
    private String title;

    @NotNull
    private RiskAssessmentScope scope;

    private String scopeEntityType;
    private UUID scopeEntityId;
    private String scopeEntityDisplay;
    private String methodology;
    private LocalDate nextReviewDate;
}
