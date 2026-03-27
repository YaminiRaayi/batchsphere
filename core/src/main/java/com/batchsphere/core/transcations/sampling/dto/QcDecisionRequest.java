package com.batchsphere.core.transcations.sampling.dto;

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
}
