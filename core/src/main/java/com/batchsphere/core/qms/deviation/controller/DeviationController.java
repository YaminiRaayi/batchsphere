package com.batchsphere.core.qms.deviation.controller;

import com.batchsphere.core.qms.deviation.dto.CreateDeviationRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationResponse;
import com.batchsphere.core.qms.deviation.dto.DeviationStatusUpdateRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationSummaryResponse;
import com.batchsphere.core.qms.deviation.dto.UpdateDeviationRequest;
import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.qms.deviation.service.DeviationService;
import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.report.PdfReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/deviations")
@RequiredArgsConstructor
public class DeviationController {

    private final DeviationService deviationService;
    private final PdfReportService pdfReportService;
    private final CsvExportService csvExportService;
    private final AuthenticatedActorService authenticatedActorService;

    @PostMapping
    public ResponseEntity<DeviationResponse> createDeviation(@Valid @RequestBody CreateDeviationRequest request) {
        return ResponseEntity.ok(deviationService.createDeviation(request));
    }

    @GetMapping
    public ResponseEntity<?> getAllDeviations(Pageable pageable,
                                              @RequestParam(required = false) String format,
                                              @RequestHeader(value = "Accept", required = false) String accept) {
        Page<DeviationResponse> page = deviationService.getAllDeviations(pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("deviations.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
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

    @GetMapping(value = "/{id}/report", produces = "application/pdf")
    public ResponseEntity<byte[]> downloadReport(@PathVariable UUID id) {
        DeviationResponse deviation = deviationService.getDeviationById(id);
        byte[] pdf = pdfReportService.generateDeviationReport(deviation, authenticatedActorService.currentActor());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"deviation-" + deviation.getDeviationNumber() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
