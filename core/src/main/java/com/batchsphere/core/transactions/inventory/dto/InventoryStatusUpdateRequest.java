package com.batchsphere.core.transactions.inventory.dto;

import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InventoryStatusUpdateRequest {

    @NotNull
    private InventoryStatus status;

    @Size(max = 500)
    private String remarks;
}
