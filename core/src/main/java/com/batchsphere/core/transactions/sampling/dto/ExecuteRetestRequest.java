package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ExecuteRetestRequest {
    @NotBlank
    private String analystCode;
    private String remarks;
}
