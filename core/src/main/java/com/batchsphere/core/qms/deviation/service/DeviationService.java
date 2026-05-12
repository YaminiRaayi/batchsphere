package com.batchsphere.core.qms.deviation.service;

import com.batchsphere.core.qms.deviation.dto.CreateDeviationRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationResponse;
import com.batchsphere.core.qms.deviation.dto.DeviationStatusUpdateRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationSummaryResponse;
import com.batchsphere.core.qms.deviation.dto.UpdateDeviationRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface DeviationService {
    DeviationResponse createDeviation(CreateDeviationRequest request);

    Page<DeviationResponse> getAllDeviations(Pageable pageable);

    DeviationResponse getDeviationById(UUID id);

    DeviationResponse updateDeviation(UUID id, UpdateDeviationRequest request);

    DeviationResponse updateStatus(UUID id, DeviationStatusUpdateRequest request);

    DeviationSummaryResponse getSummary();
}
