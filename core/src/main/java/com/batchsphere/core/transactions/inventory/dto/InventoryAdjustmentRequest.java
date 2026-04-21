package com.batchsphere.core.transactions.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class InventoryAdjustmentRequest {

    @NotNull
    @DecimalMin(value = "0.001", inclusive = true)
    private BigDecimal quantityDelta;

    @NotBlank
    @Size(max = 500)
    private String reason;

    @NotNull
    private Boolean increase;
}
