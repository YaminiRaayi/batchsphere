package com.batchsphere.core.qms.deviation.dto;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import com.batchsphere.core.qms.deviation.entity.DeviationStatus;
import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class DeviationSummaryResponse {
    Map<DeviationStatus, Long> countsByStatus;
    Map<DeviationSeverity, Long> countsBySeverity;
}
