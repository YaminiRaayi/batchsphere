package com.batchsphere.core.transactions.inventory.dto;

import com.batchsphere.core.transactions.inventory.entity.InventoryReferenceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class InventoryIssueRequest {

    @NotNull
    @DecimalMin(value = "0.001", inclusive = true)
    private BigDecimal quantity;

    @NotNull
    private InventoryReferenceType referenceType;

    @Size(max = 100)
    private String referenceNumber;

    @NotBlank
    @Size(max = 500)
    private String reason;

    @Size(max = 500)
    private String remarks;
}
