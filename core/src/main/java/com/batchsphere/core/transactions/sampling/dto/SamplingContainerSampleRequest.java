package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class SamplingContainerSampleRequest {
    @NotNull
    private UUID grnContainerId;
    @NotNull
    @DecimalMin(value = "0.001")
    private BigDecimal sampledQuantity;
}
