package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EscalateQcInvestigationRequest {

    @NotBlank
    private String phaseOneSummary;

    @NotBlank
    private String phaseTwoAssessment;
}
