package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.CompleteQaInvestigationReviewRequest;
import com.batchsphere.core.transactions.sampling.dto.DestroyRetainedSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.EscalateQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.ExecuteRetestRequest;
import com.batchsphere.core.transactions.sampling.dto.ExecuteResampleRequest;
import com.batchsphere.core.transactions.sampling.dto.OpenQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.QcReceiptRequest;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.QcInvestigationResponse;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.dto.ResolveQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingHandoffRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingStartRequest;
import com.batchsphere.core.transactions.sampling.dto.StartQcReviewRequest;
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
    List<SamplingRequestResponse> getSamplingCycles(UUID samplingRequestId);

    SamplingRequestResponse createSamplingPlan(UUID samplingRequestId, CreateSamplingPlanRequest request);

    SamplingRequestResponse updateSamplingPlan(UUID samplingRequestId, UUID planId, UpdateSamplingPlanRequest request);

    SamplingRequestResponse updateSamplingLabel(UUID samplingRequestId, Boolean samplingLabelApplied, String updatedBy);
    SamplingRequestResponse startSampling(UUID samplingRequestId, SamplingStartRequest request);
    SamplingRequestResponse completeSampling(UUID samplingRequestId, SamplingCompletionRequest request);
    SamplingRequestResponse handoffToQc(UUID samplingRequestId, SamplingHandoffRequest request);
    SamplingRequestResponse receiveInQc(UUID samplingRequestId, QcReceiptRequest request);
    SamplingRequestResponse startQcReview(UUID samplingRequestId, StartQcReviewRequest request);
    List<QcTestResultResponse> getWorksheet(UUID samplingRequestId);
    QcTestResultResponse recordWorksheetResult(UUID samplingRequestId, UUID testResultId, RecordQcTestResultRequest request);
    List<QcInvestigationResponse> getInvestigations(UUID samplingRequestId);
    QcInvestigationResponse openInvestigation(UUID samplingRequestId, OpenQcInvestigationRequest request);
    QcInvestigationResponse escalateInvestigationToPhaseTwo(UUID samplingRequestId, UUID investigationId, EscalateQcInvestigationRequest request);
    QcInvestigationResponse resolveInvestigation(UUID samplingRequestId, UUID investigationId, ResolveQcInvestigationRequest request);
    QcInvestigationResponse completeQaInvestigationReview(UUID samplingRequestId, UUID investigationId, CompleteQaInvestigationReviewRequest request);
    SamplingRequestResponse executeRetest(UUID samplingRequestId, ExecuteRetestRequest request);
    SamplingRequestResponse destroyRetainedSample(UUID samplingRequestId, DestroyRetainedSampleRequest request);
    SamplingRequestResponse executeResample(UUID samplingRequestId, ExecuteResampleRequest request);
    SamplingRequestResponse recordQcDecision(UUID samplingRequestId, QcDecisionRequest request);
}
