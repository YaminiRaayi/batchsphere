package com.batchsphere.core.qms.capa.controller;

import com.batchsphere.core.qms.capa.dto.CapaApproveRequest;
import com.batchsphere.core.qms.capa.dto.CapaAlertResponse;
import com.batchsphere.core.qms.capa.dto.CapaEffectivenessReviewRequest;
import com.batchsphere.core.qms.capa.dto.CapaReassignmentResponse;
import com.batchsphere.core.qms.capa.dto.CapaRejectRequest;
import com.batchsphere.core.qms.capa.dto.ReassignCapaRequest;
import com.batchsphere.core.qms.capa.dto.ScheduleEffectivenessReviewRequest;
import com.batchsphere.core.qms.capa.dto.CapaResponse;
import com.batchsphere.core.qms.capa.dto.CapaStatusUpdateRequest;
import com.batchsphere.core.qms.capa.dto.CapaSummaryResponse;
import com.batchsphere.core.qms.capa.dto.CreateCapaRequest;
import com.batchsphere.core.qms.capa.dto.UpdateCapaRequest;
import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.qms.capa.service.CapaService;
import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.report.PdfReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
@RequestMapping("/api/capas")
@RequiredArgsConstructor
public class CapaController {

    private final CapaService capaService;
    private final PdfReportService pdfReportService;
    private final CsvExportService csvExportService;
    private final AuthenticatedActorService authenticatedActorService;

    @PostMapping
    public ResponseEntity<CapaResponse> createCapa(@Valid @RequestBody CreateCapaRequest request) {
        return ResponseEntity.ok(capaService.createCapa(request));
    }

    @GetMapping
    public ResponseEntity<?> getAllCapas(@RequestParam(required = false) UUID deviationId,
                                         @RequestParam(required = false) String format,
                                         @RequestHeader(value = "Accept", required = false) String accept,
                                         Pageable pageable) {
        Page<CapaResponse> page = capaService.getAllCapas(deviationId, pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("capas.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
    }

    @GetMapping("/summary")
    public ResponseEntity<CapaSummaryResponse> getSummary() {
        return ResponseEntity.ok(capaService.getSummary());
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<CapaAlertResponse>> getAlerts() {
        return ResponseEntity.ok(capaService.getAlerts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CapaResponse> getCapaById(@PathVariable UUID id) {
        return ResponseEntity.ok(capaService.getCapaById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CapaResponse> updateCapa(@PathVariable UUID id, @Valid @RequestBody UpdateCapaRequest request) {
        return ResponseEntity.ok(capaService.updateCapa(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<CapaResponse> updateStatus(@PathVariable UUID id,
                                                     @Valid @RequestBody CapaStatusUpdateRequest request) {
        return ResponseEntity.ok(capaService.updateStatus(id, request));
    }

    @PostMapping("/{id}/submit-for-approval")
    public ResponseEntity<CapaResponse> submitForApproval(@PathVariable UUID id) {
        return ResponseEntity.ok(capaService.submitForApproval(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<CapaResponse> approveCapa(@PathVariable UUID id,
                                                    @Valid @RequestBody CapaApproveRequest request) {
        return ResponseEntity.ok(capaService.approveCapa(id, request));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<CapaResponse> rejectCapa(@PathVariable UUID id,
                                                   @Valid @RequestBody CapaRejectRequest request) {
        return ResponseEntity.ok(capaService.rejectCapa(id, request));
    }

    @PostMapping("/{id}/schedule-effectiveness-review")
    public ResponseEntity<CapaResponse> scheduleEffectivenessReview(@PathVariable UUID id,
                                                                     @Valid @RequestBody ScheduleEffectivenessReviewRequest request) {
        return ResponseEntity.ok(capaService.scheduleEffectivenessReview(id, request));
    }

    @PostMapping("/{id}/review-effectiveness")
    public ResponseEntity<CapaResponse> reviewEffectiveness(@PathVariable UUID id,
                                                            @Valid @RequestBody CapaEffectivenessReviewRequest request) {
        return ResponseEntity.ok(capaService.reviewEffectiveness(id, request));
    }

    @PostMapping("/{id}/reassign")
    public ResponseEntity<CapaResponse> reassign(@PathVariable UUID id,
                                                 @Valid @RequestBody ReassignCapaRequest request) {
        return ResponseEntity.ok(capaService.reassignCapa(id, request));
    }

    @GetMapping("/{id}/reassignments")
    public ResponseEntity<List<CapaReassignmentResponse>> getReassignmentHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(capaService.getReassignmentHistory(id));
    }

    @GetMapping(value = "/{id}/report", produces = "application/pdf")
    public ResponseEntity<byte[]> downloadReport(@PathVariable UUID id) {
        CapaResponse capa = capaService.getCapaById(id);
        byte[] pdf = pdfReportService.generateCapaReport(capa, authenticatedActorService.currentActor());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"capa-" + capa.getCapaNumber() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
