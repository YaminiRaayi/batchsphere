package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.QcInvestigationOutcome;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ResolveQcInvestigationRequest {
    @NotNull
    private QcInvestigationOutcome outcome;
    @NotBlank
    private String phaseSummary;
    private String rootCause;
    @NotBlank
    private String resolutionRemarks;
    private Boolean capaRequired;
    private String capaReference;
}
