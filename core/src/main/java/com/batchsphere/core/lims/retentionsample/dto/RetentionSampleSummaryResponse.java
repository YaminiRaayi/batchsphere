package com.batchsphere.core.lims.retentionsample.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RetentionSampleSummaryResponse {
    private long totalStored;
    private long expiringIn30Days;
    private long overdueDisposal;
    private long retrievedThisMonth;
}
