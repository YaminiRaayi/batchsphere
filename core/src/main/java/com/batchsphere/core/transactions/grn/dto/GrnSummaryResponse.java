package com.batchsphere.core.transactions.grn.dto;

import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import lombok.Builder;

import java.util.Map;

@Builder
public record GrnSummaryResponse(
        Map<GrnStatus, Long> countsByStatus
) {
}
