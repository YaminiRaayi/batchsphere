package com.batchsphere.core.transactions.sampling.controller;

import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingLabelUpdateRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
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

    @GetMapping("/{id}")
    public ResponseEntity<SamplingRequestResponse> getSamplingRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(samplingService.getSamplingRequestById(id));
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

    @PostMapping("/{id}/complete")
    public ResponseEntity<SamplingRequestResponse> completeSampling(@PathVariable UUID id,
                                                                    @Valid @RequestBody SamplingCompletionRequest request) {
        return ResponseEntity.ok(samplingService.completeSampling(id, request));
    }

    @PostMapping("/{id}/qc-decision")
    public ResponseEntity<SamplingRequestResponse> recordQcDecision(@PathVariable UUID id,
                                                                    @Valid @RequestBody QcDecisionRequest request) {
        return ResponseEntity.ok(samplingService.recordQcDecision(id, request));
    }
}
