package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record WarehouseZoneRuleResponse(
        UUID id,
        UUID roomId,
        String roomCode,
        String roomName,
        String zoneName,
        String allowedMaterialType,
        StorageCondition allowedStorageCondition,
        Boolean restrictedAccess,
        Boolean quarantineOnly,
        Boolean rejectedOnly,
        String notes,
        String createdBy,
        LocalDateTime createdAt,
        String updatedBy,
        LocalDateTime updatedAt
) {
}
