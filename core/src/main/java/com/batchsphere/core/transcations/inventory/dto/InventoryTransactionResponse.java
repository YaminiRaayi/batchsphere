package com.batchsphere.core.transcations.inventory.dto;

import com.batchsphere.core.transcations.inventory.entity.InventoryReferenceType;
import com.batchsphere.core.transcations.inventory.entity.InventoryTransactionType;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class InventoryTransactionResponse {
    UUID id;
    UUID inventoryId;
    UUID materialId;
    UUID batchId;
    UUID palletId;
    InventoryTransactionType transactionType;
    InventoryReferenceType referenceType;
    UUID referenceId;
    BigDecimal quantity;
    String uom;
    String remarks;
    String createdBy;
    LocalDateTime createdAt;
}
