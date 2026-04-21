package com.batchsphere.core.transactions.inventory.dto;

import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import lombok.Builder;

import java.util.Map;

@Builder
public record InventorySummaryResponse(
        Map<InventoryStatus, Long> countsByStatus
) {
}
