package com.batchsphere.core.transcations.sampling.service;

import com.batchsphere.core.transcations.grn.entity.GrnItem;
import com.batchsphere.core.transcations.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transcations.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transcations.sampling.dto.UpdateSamplingPlanRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface SamplingService {

    void createSamplingRequestsForGrn(UUID grnId, List<GrnItem> items, String actor);

    Page<SamplingRequestResponse> getAllSamplingRequests(Pageable pageable);

    SamplingRequestResponse getSamplingRequestById(UUID id);

    SamplingRequestResponse createSamplingPlan(UUID samplingRequestId, CreateSamplingPlanRequest request);

    SamplingRequestResponse updateSamplingPlan(UUID samplingRequestId, UUID planId, UpdateSamplingPlanRequest request);

    SamplingRequestResponse updateSamplingLabel(UUID samplingRequestId, Boolean samplingLabelApplied, String updatedBy);
}
