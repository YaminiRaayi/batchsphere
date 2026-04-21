package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import lombok.Builder;

import java.util.UUID;

@Builder
public record AvailablePalletResponse(
        UUID palletId,
        String palletCode,
        String palletName,
        UUID shelfId,
        String shelfCode,
        UUID rackId,
        String rackCode,
        UUID roomId,
        String roomCode,
        UUID warehouseId,
        String warehouseCode,
        StorageCondition storageCondition
) {
}
