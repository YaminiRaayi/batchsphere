package com.batchsphere.core.transactions.sampling.controller;

import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.CompleteQaInvestigationReviewRequest;
import com.batchsphere.core.transactions.sampling.dto.DestroyRetainedSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.EscalateQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.ExecuteResampleRequest;
import com.batchsphere.core.transactions.sampling.dto.ExecuteRetestRequest;
import com.batchsphere.core.transactions.sampling.dto.OpenQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.QcReceiptRequest;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.QcInvestigationResponse;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.dto.ResolveQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingLabelUpdateRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingHandoffRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingStartRequest;
import com.batchsphere.core.transactions.sampling.dto.StartQcReviewRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingSummaryResponse;
import com.batchsphere.core.transactions.sampling.dto.UpdateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.service.SamplingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sampling-requests")
@RequiredArgsConstructor
public class SamplingController {

    private final SamplingService samplingService;

    @GetMapping
    public ResponseEntity<Page<SamplingRequestResponse>> getAllSamplingRequests(Pageable pageable) {
        return ResponseEntity.ok(samplingService.getAllSamplingRequests(pageable));
    }

    @GetMapping("/summary")
    public ResponseEntity<SamplingSummaryResponse> getSamplingSummary() {
        return ResponseEntity.ok(samplingService.getSamplingSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SamplingRequestResponse> getSamplingRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(samplingService.getSamplingRequestById(id));
    }

    @GetMapping("/{id}/cycles")
    public ResponseEntity<java.util.List<SamplingRequestResponse>> getSamplingCycles(@PathVariable UUID id) {
        return ResponseEntity.ok(samplingService.getSamplingCycles(id));
    }

    @PostMapping("/{id}/plans")
    public ResponseEntity<SamplingRequestResponse> createSamplingPlan(@PathVariable UUID id, @Valid @RequestBody CreateSamplingPlanRequest request) {
        return ResponseEntity.ok(samplingService.createSamplingPlan(id, request));
    }

    @PutMapping("/{samplingRequestId}/plans/{planId}")
    public ResponseEntity<SamplingRequestResponse> updateSamplingPlan(
            @PathVariable UUID samplingRequestId,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdateSamplingPlanRequest request) {
        return ResponseEntity.ok(samplingService.updateSamplingPlan(samplingRequestId, planId, request));
    }

    @PutMapping("/{id}/sampling-label")
    public ResponseEntity<SamplingRequestResponse> updateSamplingLabel(@PathVariable UUID id, @Valid @RequestBody SamplingLabelUpdateRequest request) {
        return ResponseEntity.ok(samplingService.updateSamplingLabel(id, request.getSamplingLabelApplied(), request.getUpdatedBy()));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<SamplingRequestResponse> startSampling(@PathVariable UUID id,
                                                                 @Valid @RequestBody SamplingStartRequest request) {
        return ResponseEntity.ok(samplingService.startSampling(id, request));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<SamplingRequestResponse> completeSampling(@PathVariable UUID id,
                                                                    @Valid @RequestBody SamplingCompletionRequest request) {
        return ResponseEntity.ok(samplingService.completeSampling(id, request));
    }

    @PostMapping("/{id}/handoff-to-qc")
    public ResponseEntity<SamplingRequestResponse> handoffToQc(@PathVariable UUID id,
                                                               @Valid @RequestBody SamplingHandoffRequest request) {
        return ResponseEntity.ok(samplingService.handoffToQc(id, request));
    }

    @PostMapping("/{id}/qc-receipt")
    public ResponseEntity<SamplingRequestResponse> receiveInQc(@PathVariable UUID id,
                                                               @Valid @RequestBody QcReceiptRequest request) {
        return ResponseEntity.ok(samplingService.receiveInQc(id, request));
    }

    @PostMapping("/{id}/start-review")
    public ResponseEntity<SamplingRequestResponse> startQcReview(@PathVariable UUID id,
                                                                 @Valid @RequestBody StartQcReviewRequest request) {
        return ResponseEntity.ok(samplingService.startQcReview(id, request));
    }

    @GetMapping("/{id}/worksheet")
    public ResponseEntity<java.util.List<QcTestResultResponse>> getWorksheet(@PathVariable UUID id) {
        return ResponseEntity.ok(samplingService.getWorksheet(id));
    }

    @PutMapping("/{id}/worksheet/{testResultId}")
    public ResponseEntity<QcTestResultResponse> recordWorksheetResult(@PathVariable UUID id,
                                                                      @PathVariable UUID testResultId,
                                                                      @Valid @RequestBody RecordQcTestResultRequest request) {
        return ResponseEntity.ok(samplingService.recordWorksheetResult(id, testResultId, request));
    }

    @GetMapping("/{id}/investigations")
    public ResponseEntity<java.util.List<QcInvestigationResponse>> getInvestigations(@PathVariable UUID id) {
        return ResponseEntity.ok(samplingService.getInvestigations(id));
    }

    @PostMapping("/{id}/investigations")
    public ResponseEntity<QcInvestigationResponse> openInvestigation(@PathVariable UUID id,
                                                                     @Valid @RequestBody OpenQcInvestigationRequest request) {
        return ResponseEntity.ok(samplingService.openInvestigation(id, request));
    }

    @PostMapping("/{id}/investigations/{investigationId}/phase-ii")
    public ResponseEntity<QcInvestigationResponse> escalateInvestigationToPhaseTwo(@PathVariable UUID id,
                                                                                   @PathVariable UUID investigationId,
                                                                                   @Valid @RequestBody EscalateQcInvestigationRequest request) {
        return ResponseEntity.ok(samplingService.escalateInvestigationToPhaseTwo(id, investigationId, request));
    }

    @PostMapping("/{id}/investigations/{investigationId}/resolve")
    public ResponseEntity<QcInvestigationResponse> resolveInvestigation(@PathVariable UUID id,
                                                                        @PathVariable UUID investigationId,
                                                                        @Valid @RequestBody ResolveQcInvestigationRequest request) {
        return ResponseEntity.ok(samplingService.resolveInvestigation(id, investigationId, request));
    }

    @PostMapping("/{id}/investigations/{investigationId}/qa-review")
    public ResponseEntity<QcInvestigationResponse> completeQaInvestigationReview(@PathVariable UUID id,
                                                                                 @PathVariable UUID investigationId,
                                                                                 @Valid @RequestBody CompleteQaInvestigationReviewRequest request) {
        return ResponseEntity.ok(samplingService.completeQaInvestigationReview(id, investigationId, request));
    }

    @PostMapping("/{id}/retest")
    public ResponseEntity<SamplingRequestResponse> executeRetest(@PathVariable UUID id,
                                                                 @Valid @RequestBody ExecuteRetestRequest request) {
        return ResponseEntity.ok(samplingService.executeRetest(id, request));
    }

    @PostMapping("/{id}/retained-sample/destroy")
    public ResponseEntity<SamplingRequestResponse> destroyRetainedSample(@PathVariable UUID id,
                                                                         @Valid @RequestBody DestroyRetainedSampleRequest request) {
        return ResponseEntity.ok(samplingService.destroyRetainedSample(id, request));
    }

    @PostMapping("/{id}/resample")
    public ResponseEntity<SamplingRequestResponse> executeResample(@PathVariable UUID id,
                                                                   @Valid @RequestBody ExecuteResampleRequest request) {
        return ResponseEntity.ok(samplingService.executeResample(id, request));
    }

    @PostMapping("/{id}/qc-decision")
    public ResponseEntity<SamplingRequestResponse> recordQcDecision(@PathVariable UUID id,
                                                                    @Valid @RequestBody QcDecisionRequest request) {
        return ResponseEntity.ok(samplingService.recordQcDecision(id, request));
    }
}
