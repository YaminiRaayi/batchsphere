package com.batchsphere.core.qms.riskassessment.dto;

import com.batchsphere.core.qms.riskassessment.entity.RiskControlType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class UpdateRiskItemRequest {

    private String processStep;

    @NotBlank
    private String failureMode;

    @NotBlank
    private String failureEffect;

    @NotBlank
    private String failureCause;

    private String currentControls;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer probability;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer severity;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer detectability;

    private RiskControlType riskControlType;
    private String proposedAction;
    private String actionOwner;
    private LocalDate actionDueDate;
    private UUID linkedCapaId;

    @Min(1)
    @Max(5)
    private Integer residualProbability;

    @Min(1)
    @Max(5)
    private Integer residualSeverity;

    @Min(1)
    @Max(5)
    private Integer residualDetectability;
}
