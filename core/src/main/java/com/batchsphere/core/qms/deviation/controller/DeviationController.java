package com.batchsphere.core.qms.deviation.controller;

import com.batchsphere.core.qms.deviation.dto.CreateDeviationRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationResponse;
import com.batchsphere.core.qms.deviation.dto.DeviationStatusUpdateRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationSummaryResponse;
import com.batchsphere.core.qms.deviation.dto.UpdateDeviationRequest;
import com.batchsphere.core.qms.deviation.service.DeviationService;
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
@RequestMapping("/api/deviations")
@RequiredArgsConstructor
public class DeviationController {

    private final DeviationService deviationService;

    @PostMapping
    public ResponseEntity<DeviationResponse> createDeviation(@Valid @RequestBody CreateDeviationRequest request) {
        return ResponseEntity.ok(deviationService.createDeviation(request));
    }

    @GetMapping
    public ResponseEntity<Page<DeviationResponse>> getAllDeviations(Pageable pageable) {
        return ResponseEntity.ok(deviationService.getAllDeviations(pageable));
    }

    @GetMapping("/summary")
    public ResponseEntity<DeviationSummaryResponse> getSummary() {
        return ResponseEntity.ok(deviationService.getSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviationResponse> getDeviationById(@PathVariable UUID id) {
        return ResponseEntity.ok(deviationService.getDeviationById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeviationResponse> updateDeviation(@PathVariable UUID id,
                                                             @Valid @RequestBody UpdateDeviationRequest request) {
        return ResponseEntity.ok(deviationService.updateDeviation(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<DeviationResponse> updateStatus(@PathVariable UUID id,
                                                          @Valid @RequestBody DeviationStatusUpdateRequest request) {
        return ResponseEntity.ok(deviationService.updateStatus(id, request));
    }
}
