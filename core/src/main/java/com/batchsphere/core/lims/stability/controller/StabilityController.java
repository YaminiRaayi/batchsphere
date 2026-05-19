package com.batchsphere.core.lims.stability.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.CreateStabilityStudyRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.PullTimepointRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.RecordStabilityResultRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityResultResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityStudyDetailResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityStudySummaryResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityTimepointResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.TrendSeries;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.UpdateStabilityStatusRequest;
import com.batchsphere.core.lims.stability.service.StabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lims/stability")
@RequiredArgsConstructor
public class StabilityController {
    private final StabilityService stabilityService;
    private final CsvExportService csvExportService;

    @PostMapping
    public ResponseEntity<StabilityStudyDetailResponse> create(@RequestBody CreateStabilityStudyRequest request) {
        return ResponseEntity.ok(stabilityService.createStudy(request));
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String format,
                                  @RequestHeader(value = "Accept", required = false) String accept) {
        List<StabilityStudySummaryResponse> rows = stabilityService.listStudies();
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("stability-studies.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/due-soon")
    public ResponseEntity<?> dueSoon(@RequestParam(defaultValue = "14") int days,
                                     @RequestParam(required = false) String format,
                                     @RequestHeader(value = "Accept", required = false) String accept) {
        List<StabilityTimepointResponse> rows = stabilityService.dueSoon(days);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("stability-due-soon.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StabilityStudyDetailResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(stabilityService.getStudy(id));
    }

    @PutMapping("/{id}/timepoints/{tpId}/pull")
    public ResponseEntity<StabilityTimepointResponse> pull(@PathVariable UUID id, @PathVariable UUID tpId, @RequestBody PullTimepointRequest request) {
        return ResponseEntity.ok(stabilityService.pullTimepoint(id, tpId, request));
    }

    @PostMapping("/{id}/timepoints/{tpId}/results")
    public ResponseEntity<StabilityResultResponse> recordResult(@PathVariable UUID id, @PathVariable UUID tpId, @RequestBody RecordStabilityResultRequest request) {
        return ResponseEntity.ok(stabilityService.recordResult(id, tpId, request));
    }

    @GetMapping("/{id}/trend")
    public ResponseEntity<List<TrendSeries>> trend(@PathVariable UUID id) {
        return ResponseEntity.ok(stabilityService.trend(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<StabilityStudySummaryResponse> status(@PathVariable UUID id, @RequestBody UpdateStabilityStatusRequest request) {
        return ResponseEntity.ok(stabilityService.updateStatus(id, request));
    }
}
