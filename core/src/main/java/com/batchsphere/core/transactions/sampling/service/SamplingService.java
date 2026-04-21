package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingSummaryResponse;
import com.batchsphere.core.transactions.sampling.dto.UpdateSamplingPlanRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface SamplingService {

    void createSamplingRequestsForGrn(UUID grnId, List<GrnItem> items, String actor);

    Page<SamplingRequestResponse> getAllSamplingRequests(Pageable pageable);

    SamplingSummaryResponse getSamplingSummary();

    SamplingRequestResponse getSamplingRequestById(UUID id);

    SamplingRequestResponse createSamplingPlan(UUID samplingRequestId, CreateSamplingPlanRequest request);

    SamplingRequestResponse updateSamplingPlan(UUID samplingRequestId, UUID planId, UpdateSamplingPlanRequest request);

    SamplingRequestResponse updateSamplingLabel(UUID samplingRequestId, Boolean samplingLabelApplied, String updatedBy);
    SamplingRequestResponse completeSampling(UUID samplingRequestId, SamplingCompletionRequest request);
    SamplingRequestResponse recordQcDecision(UUID samplingRequestId, QcDecisionRequest request);
}
