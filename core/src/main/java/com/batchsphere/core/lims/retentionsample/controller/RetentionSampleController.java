package com.batchsphere.core.lims.retentionsample.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.lims.retentionsample.dto.CreateRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.dto.DisposeRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.dto.RetentionSampleResponse;
import com.batchsphere.core.lims.retentionsample.dto.RetentionSampleSummaryResponse;
import com.batchsphere.core.lims.retentionsample.dto.RetrieveRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.service.RetentionSampleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/retention-samples")
@RequiredArgsConstructor
public class RetentionSampleController {

    private final RetentionSampleService retentionSampleService;
    private final CsvExportService csvExportService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID materialId,
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) String format,
            @RequestHeader(value = "Accept", required = false) String accept,
            Pageable pageable) {
        Page<RetentionSampleResponse> page = retentionSampleService.findByFilters(status, materialId, lotNumber, pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("retention-samples.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
    }

    @PostMapping
    public ResponseEntity<RetentionSampleResponse> create(@Valid @RequestBody CreateRetentionSampleRequest request) {
        return ResponseEntity.ok(retentionSampleService.createRetentionSample(request));
    }

    @GetMapping("/summary")
    public ResponseEntity<RetentionSampleSummaryResponse> getSummary() {
        return ResponseEntity.ok(retentionSampleService.getSummary());
    }

    @GetMapping("/expiring-soon")
    public ResponseEntity<List<RetentionSampleResponse>> expiringSoon(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(retentionSampleService.findExpiringSoon(days));
    }

    @GetMapping("/due-for-disposal")
    public ResponseEntity<List<RetentionSampleResponse>> dueForDisposal() {
        return ResponseEntity.ok(retentionSampleService.findDueForDisposal());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RetentionSampleResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(retentionSampleService.getById(id));
    }

    @PostMapping("/{id}/retrieve")
    public ResponseEntity<RetentionSampleResponse> retrieve(
            @PathVariable UUID id,
            @Valid @RequestBody RetrieveRetentionSampleRequest request) {
        return ResponseEntity.ok(retentionSampleService.retrieveSample(id, request));
    }

    @PostMapping("/{id}/dispose")
    public ResponseEntity<RetentionSampleResponse> dispose(
            @PathVariable UUID id,
            @Valid @RequestBody DisposeRetentionSampleRequest request) {
        return ResponseEntity.ok(retentionSampleService.disposeSample(id, request));
    }
}
