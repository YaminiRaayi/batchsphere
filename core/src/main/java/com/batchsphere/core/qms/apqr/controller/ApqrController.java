package com.batchsphere.core.qms.apqr.controller;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.qms.apqr.dto.ApqrDTO.*;
import com.batchsphere.core.qms.apqr.entity.Apqr.ApqrStatus;
import com.batchsphere.core.qms.apqr.service.ApqrService;
import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.report.PdfReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/apqr")
@RequiredArgsConstructor
public class ApqrController {

  private final ApqrService apqrService;
  private final PdfReportService pdfReportService;
  private final CsvExportService csvExportService;
  private final AuthenticatedActorService authenticatedActorService;

  @PostMapping
  public ResponseEntity<ApqrResponse> create(@Valid @RequestBody CreateApqrRequest request) {
    return ResponseEntity.ok(apqrService.createApqr(request));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApqrResponse> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(apqrService.getApqr(id));
  }

  @GetMapping
  public ResponseEntity<?> list(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) UUID materialId,
      @RequestParam(required = false) ApqrStatus status,
      @RequestParam(required = false) String format,
      @RequestHeader(value = "Accept", required = false) String accept,
      @PageableDefault(size = 20) Pageable pageable) {
    Page<ApqrResponse> page = apqrService.listApqrs(year, materialId, status, pageable);
    if (csvExportService.requested(format, accept)) {
      return csvExportService.response("apqrs.csv", page.getContent());
    }
    return ResponseEntity.ok(page);
  }

  @PostMapping("/{id}/compile")
  public ResponseEntity<ApqrResponse> compile(@PathVariable UUID id) {
    return ResponseEntity.ok(apqrService.compileApqr(id));
  }

  @PutMapping("/{id}/conclusions")
  public ResponseEntity<ApqrResponse> updateConclusions(
      @PathVariable UUID id,
      @Valid @RequestBody ApqrConclusionRequest request) {
    return ResponseEntity.ok(apqrService.updateConclusions(id, request));
  }

  @PostMapping("/{id}/approve")
  public ResponseEntity<ApqrResponse> approve(
      @PathVariable UUID id,
      @Valid @RequestBody ApproveApqrRequest request) {
    return ResponseEntity.ok(apqrService.approveApqr(id, request));
  }

  @PostMapping("/{id}/close")
  public ResponseEntity<ApqrResponse> close(@PathVariable UUID id) {
    return ResponseEntity.ok(apqrService.closeApqr(id));
  }

  @GetMapping("/summary")
  public ResponseEntity<List<ApqrSummaryItem>> getSummary() {
    return ResponseEntity.ok(apqrService.getApqrSummary());
  }

  @GetMapping("/in-progress")
  public ResponseEntity<List<ApqrResponse>> getInProgress() {
    return ResponseEntity.ok(apqrService.getApqrsInProgress());
  }

  @GetMapping(value = "/{id}/report", produces = "application/pdf")
  public ResponseEntity<byte[]> downloadReport(@PathVariable UUID id) {
    ApqrResponse apqr = apqrService.getApqr(id);
    byte[] pdf = pdfReportService.generateApqrReport(apqr, authenticatedActorService.currentActor());
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"apqr-" + apqr.getApqrNumber() + ".pdf\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf);
  }
}