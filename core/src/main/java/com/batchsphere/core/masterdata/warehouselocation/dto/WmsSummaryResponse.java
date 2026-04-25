package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Builder
public record WmsSummaryResponse(
        List<WarehouseSummary> warehouses,
        List<RoomSummary> rooms,
        List<WarehouseZoneRuleResponse> zoneRules,
        List<MaterialLocationRuleResponse> materialLocations
) {
    @Builder
    public record WarehouseSummary(
            UUID warehouseId,
            UUID businessUnitId,
            String businessUnitCode,
            String businessUnitName,
            String warehouseCode,
            String warehouseName,
            long roomCount,
            long rackCount,
            long shelfCount,
            long palletCount
    ) {
    }

    @Builder
    public record RoomSummary(
            UUID roomId,
            UUID warehouseId,
            UUID businessUnitId,
            String businessUnitCode,
            String businessUnitName,
            String warehouseCode,
            String roomCode,
            String roomName,
            StorageCondition storageCondition,
            BigDecimal maxCapacity,
            String capacityUom,
            String temperatureRange,
            String humidityRange,
            BigDecimal currentLoad,
            long currentLots,
            long activePallets,
            long totalPallets,
            long rackCount,
            long shelfCount,
            BigDecimal occupancyPercent
    ) {
    }
}
