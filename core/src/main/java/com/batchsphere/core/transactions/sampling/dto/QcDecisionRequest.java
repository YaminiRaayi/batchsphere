package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QcDecisionRequest {
    @NotNull
    private Boolean approved;
    @NotBlank
    private String remarks;
    @NotBlank
    private String updatedBy;
    @NotBlank
    private String confirmedBy;
    @NotBlank
    private String confirmationText;
}
