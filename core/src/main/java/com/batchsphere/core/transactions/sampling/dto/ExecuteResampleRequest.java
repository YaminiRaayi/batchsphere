package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ExecuteResampleRequest {
    @NotBlank
    private String reason;
}
