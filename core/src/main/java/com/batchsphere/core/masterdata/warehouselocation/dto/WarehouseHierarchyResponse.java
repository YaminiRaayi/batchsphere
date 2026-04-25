package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Builder
public record WarehouseHierarchyResponse(
        UUID id,
        String warehouseCode,
        String warehouseName,
        UUID businessUnitId,
        String businessUnitCode,
        String businessUnitName,
        List<RoomNode> rooms
) {
    @Builder
    public record RoomNode(
            UUID id,
            String roomCode,
            String roomName,
            StorageCondition storageCondition,
            BigDecimal maxCapacity,
            String capacityUom,
            String temperatureRange,
            String humidityRange,
            List<RackNode> racks
    ) {
    }

    @Builder
    public record RackNode(
            UUID id,
            String rackCode,
            String rackName,
            List<ShelfNode> shelves
    ) {
    }

    @Builder
    public record ShelfNode(
            UUID id,
            String shelfCode,
            String shelfName,
            List<PalletNode> pallets
    ) {
    }

    @Builder
    public record PalletNode(
            UUID id,
            String palletCode,
            String palletName,
            StorageCondition storageCondition
    ) {
    }
}
