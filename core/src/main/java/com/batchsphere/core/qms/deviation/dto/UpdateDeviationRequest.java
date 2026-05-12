package com.batchsphere.core.qms.deviation.dto;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import com.batchsphere.core.qms.deviation.entity.DeviationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateDeviationRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String description;

    @NotNull
    private DeviationType deviationType;

    @NotNull
    private DeviationSeverity severity;

    private String department;

    private String immediateAction;

    private String investigationSummary;

    private String rootCause;

    private String impactAssessment;
}
