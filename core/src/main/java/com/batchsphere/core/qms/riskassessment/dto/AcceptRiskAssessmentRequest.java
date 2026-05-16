package com.batchsphere.core.qms.riskassessment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcceptRiskAssessmentRequest {

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    private String meaning;
    private String reason;
    private Boolean residualRiskAcceptable;
    private String overallRiskConclusion;
}
