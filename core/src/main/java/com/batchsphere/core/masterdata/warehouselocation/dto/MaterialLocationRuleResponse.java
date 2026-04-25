package com.batchsphere.core.masterdata.warehouselocation.dto;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record MaterialLocationRuleResponse(
        UUID id,
        UUID materialId,
        String materialCode,
        String materialName,
        String materialType,
        String storageCondition,
        UUID defaultWarehouseId,
        String defaultWarehouseCode,
        UUID defaultRoomId,
        String defaultRoomCode,
        UUID defaultRackId,
        String defaultRackCode,
        UUID quarantineWarehouseId,
        String quarantineWarehouseCode,
        UUID quarantineRoomId,
        String quarantineRoomCode,
        String notes,
        Long currentLots,
        BigDecimal currentStock,
        String stockUom,
        String createdBy,
        LocalDateTime createdAt,
        String updatedBy,
        LocalDateTime updatedAt
) {
}
