package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CompleteQaInvestigationReviewRequest {

    @NotNull
    private Boolean approved;

    @NotBlank
    private String qaReviewRemarks;

    @NotBlank
    private String confirmedBy;

    @NotBlank
    private String confirmationText;
}
