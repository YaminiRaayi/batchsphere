package com.batchsphere.core.transcations.grn.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ContainerSamplingLabelRequest {

    @NotNull
    @DecimalMin(value = "0.000", inclusive = false)
    private BigDecimal sampledQuantity;

    @NotBlank
    private String samplingLocation;

    @NotBlank
    private String sampledBy;
}
