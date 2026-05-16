package com.batchsphere.core.traceability.service;

import com.batchsphere.core.traceability.dto.LotTraceabilityResponse;

public interface LotTraceabilityService {
    LotTraceabilityResponse getTraceability(String searchKey);
}
