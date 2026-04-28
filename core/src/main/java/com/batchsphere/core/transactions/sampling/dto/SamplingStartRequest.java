package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SamplingStartRequest {
    @NotBlank
    private String updatedBy;
}
