package com.batchsphere.core.qms.riskassessment.controller;

import com.batchsphere.core.qms.riskassessment.dto.AcceptRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.CreateRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.CreateRiskItemRequest;
import com.batchsphere.core.qms.riskassessment.dto.RiskAssessmentResponse;
import com.batchsphere.core.qms.riskassessment.dto.RiskAssessmentSummaryResponse;
import com.batchsphere.core.qms.riskassessment.dto.RiskItemResponse;
import com.batchsphere.core.qms.riskassessment.dto.UpdateRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.UpdateRiskItemRequest;
import com.batchsphere.core.qms.riskassessment.service.RiskAssessmentService;
import com.batchsphere.core.report.CsvExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/risk-assessments")
@RequiredArgsConstructor
public class RiskAssessmentController {

    private final RiskAssessmentService riskAssessmentService;
    private final CsvExportService csvExportService;

    @GetMapping
    public ResponseEntity<?> getAllRiskAssessments(
            @RequestParam(required = false) String format,
            @RequestHeader(value = "Accept", required = false) String accept,
            Pageable pageable) {
        Page<RiskAssessmentResponse> page = riskAssessmentService.getAllRiskAssessments(pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("risk-assessments.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
    }

    @PostMapping
    public ResponseEntity<RiskAssessmentResponse> createRiskAssessment(@Valid @RequestBody CreateRiskAssessmentRequest request) {
        return ResponseEntity.ok(riskAssessmentService.createRiskAssessment(request));
    }

    @GetMapping("/summary")
    public ResponseEntity<RiskAssessmentSummaryResponse> getSummary() {
        return ResponseEntity.ok(riskAssessmentService.getSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RiskAssessmentResponse> getRiskAssessmentById(@PathVariable UUID id) {
        return ResponseEntity.ok(riskAssessmentService.getRiskAssessmentById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RiskAssessmentResponse> updateRiskAssessment(@PathVariable UUID id,
                                                                        @Valid @RequestBody UpdateRiskAssessmentRequest request) {
        return ResponseEntity.ok(riskAssessmentService.updateRiskAssessment(id, request));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<RiskItemResponse> addRiskItem(@PathVariable UUID id,
                                                         @Valid @RequestBody CreateRiskItemRequest request) {
        return ResponseEntity.ok(riskAssessmentService.addRiskItem(id, request));
    }

    @PutMapping("/{id}/items/{itemId}")
    public ResponseEntity<RiskItemResponse> updateRiskItem(@PathVariable UUID id,
                                                            @PathVariable UUID itemId,
                                                            @Valid @RequestBody UpdateRiskItemRequest request) {
        return ResponseEntity.ok(riskAssessmentService.updateRiskItem(id, itemId, request));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<Void> deleteRiskItem(@PathVariable UUID id, @PathVariable UUID itemId) {
        riskAssessmentService.deleteRiskItem(id, itemId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<RiskAssessmentResponse> acceptRiskAssessment(@PathVariable UUID id,
                                                                         @Valid @RequestBody AcceptRiskAssessmentRequest request) {
        return ResponseEntity.ok(riskAssessmentService.acceptRiskAssessment(id, request));
    }
}
