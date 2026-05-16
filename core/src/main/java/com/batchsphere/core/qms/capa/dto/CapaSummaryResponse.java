package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.qms.capa.entity.CapaStatus;
import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class CapaSummaryResponse {
    Map<CapaStatus, Long> countsByStatus;
    Long overdue;
    Long dueThisWeek;
    Long alertCount;
    Long overdueEffectiveness;
}
