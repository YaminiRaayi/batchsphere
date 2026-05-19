package com.batchsphere.core.lims.em.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.lims.em.dto.EmDtos.CreateMonitoringPointRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.DismissBreachRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.EmResultResponse;
import com.batchsphere.core.lims.em.dto.EmDtos.LinkBreachDeviationRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.MonitoringPointResponse;
import com.batchsphere.core.lims.em.dto.EmDtos.RecordEmResultRequest;
import com.batchsphere.core.lims.em.service.EnvironmentalMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class EnvironmentalMonitoringController {
    private final EnvironmentalMonitoringService service;
    private final CsvExportService csvExportService;

    @GetMapping("/api/lims/em-monitoring-points")
    public ResponseEntity<List<MonitoringPointResponse>> listPoints() {
        return ResponseEntity.ok(service.listPoints());
    }

    @PostMapping("/api/lims/em-monitoring-points")
    public ResponseEntity<MonitoringPointResponse> createPoint(@RequestBody CreateMonitoringPointRequest request) {
        return ResponseEntity.ok(service.createPoint(request));
    }

    @PostMapping("/api/lims/em-results")
    public ResponseEntity<EmResultResponse> recordResult(@RequestBody RecordEmResultRequest request) {
        return ResponseEntity.ok(service.recordResult(request));
    }

    @GetMapping("/api/lims/em-results")
    public ResponseEntity<?> listResults(
            @RequestParam(required = false) UUID pointId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String format,
            @RequestHeader(value = "Accept", required = false) String accept) {
        List<EmResultResponse> rows = service.listResults(pointId, from, to);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("environmental-monitoring-results.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/api/lims/em-results/breaches")
    public ResponseEntity<?> breaches(@RequestParam(required = false) String format,
                                      @RequestHeader(value = "Accept", required = false) String accept) {
        List<EmResultResponse> rows = service.breaches();
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("environmental-monitoring-breaches.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/api/lims/em-results/{id}/link-deviation")
    public ResponseEntity<EmResultResponse> linkDeviation(@PathVariable UUID id,
                                                          @RequestBody LinkBreachDeviationRequest request) {
        return ResponseEntity.ok(service.linkDeviation(id, request));
    }

    @PostMapping("/api/lims/em-results/{id}/dismiss")
    public ResponseEntity<EmResultResponse> dismissBreach(@PathVariable UUID id,
                                                          @RequestBody DismissBreachRequest request) {
        return ResponseEntity.ok(service.dismissBreach(id, request));
    }
}
