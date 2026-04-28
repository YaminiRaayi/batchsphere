package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StartQcReviewRequest {
    @NotBlank
    private String analystCode;
}
