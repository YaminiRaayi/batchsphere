package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import lombok.Builder;

import java.util.Map;

@Builder
public record SamplingSummaryResponse(
        Map<SamplingRequestStatus, Long> countsByStatus
) {
}
