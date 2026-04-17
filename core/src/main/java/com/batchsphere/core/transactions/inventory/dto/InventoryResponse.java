package com.batchsphere.core.transactions.inventory.dto;

import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class InventoryResponse {
    UUID id;
    UUID materialId;
    UUID batchId;
    UUID palletId;
    BigDecimal quantityOnHand;
    String uom;
    InventoryStatus status;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
