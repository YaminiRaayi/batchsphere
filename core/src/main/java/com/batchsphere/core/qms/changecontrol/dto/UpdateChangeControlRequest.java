package com.batchsphere.core.qms.changecontrol.dto;

import com.batchsphere.core.qms.changecontrol.entity.ChangeControlRisk;
import com.batchsphere.core.qms.changecontrol.entity.ChangeControlType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateChangeControlRequest {
    @NotBlank
    private String title;
    private String description;
    @NotNull
    private ChangeControlType changeType;
    @NotBlank
    private String reason;
    @NotNull
    private ChangeControlRisk riskClassification;
    private String impactAssessment;
    private String implementationPlan;
    private String effectivenessCheck;
    private LocalDate targetCompletionDate;
}
