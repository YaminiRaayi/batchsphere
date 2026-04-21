package com.batchsphere.core.transactions.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class InventoryTransferRequest {

    @NotNull
    private UUID destinationPalletId;

    @NotNull
    @DecimalMin(value = "0.001", inclusive = true)
    private BigDecimal quantity;

    @Size(max = 500)
    private String remarks;
}
