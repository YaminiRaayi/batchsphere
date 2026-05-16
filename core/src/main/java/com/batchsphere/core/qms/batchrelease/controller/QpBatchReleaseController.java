package com.batchsphere.core.qms.batchrelease.controller;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.qms.batchrelease.dto.QpBatchReleaseDTO.*;
import com.batchsphere.core.qms.batchrelease.entity.BatchReleaseStatus;
import com.batchsphere.core.qms.batchrelease.service.QpBatchReleaseService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/qp-batch-releases")
@RequiredArgsConstructor
public class QpBatchReleaseController {

  private final QpBatchReleaseService batchReleaseService;
  private final PdfReportService pdfReportService;
  private final CsvExportService csvExportService;
  private final AuthenticatedActorService authenticatedActorService;

  @GetMapping
  public ResponseEntity<?> list(
      @RequestParam(required = false) BatchReleaseStatus status,
      @RequestParam(required = false) UUID materialId,
      @RequestParam(required = false) String format,
      @RequestHeader(value = "Accept", required = false) String accept,
      @PageableDefault(size = 20) Pageable pageable) {
    Page<QpBatchReleaseResponse> page = batchReleaseService.listBatchReleases(status, materialId, pageable);
    if (csvExportService.requested(format, accept)) {
      return csvExportService.response("qp-batch-releases.csv", page.getContent());
    }
    return ResponseEntity.ok(page);
  }

  @PostMapping
  public ResponseEntity<QpBatchReleaseResponse> create(@Valid @RequestBody CreateQpBatchReleaseRequest request) {
    return ResponseEntity.ok(batchReleaseService.createBatchRelease(request));
  }

  @GetMapping("/{id}")
  public ResponseEntity<QpBatchReleaseResponse> getById(@PathVariable UUID id) {
    return ResponseEntity.ok(batchReleaseService.getBatchRelease(id));
  }

  @PostMapping("/{id}/certify")
  public ResponseEntity<QpBatchReleaseResponse> certify(
      @PathVariable UUID id,
      @Valid @RequestBody CertifyBatchRequest request) {
    return ResponseEntity.ok(batchReleaseService.certifyBatch(id, request));
  }

  @PostMapping("/{id}/reject")
  public ResponseEntity<QpBatchReleaseResponse> reject(
      @PathVariable UUID id,
      @Valid @RequestBody RejectBatchRequest request) {
    return ResponseEntity.ok(batchReleaseService.rejectBatch(id, request));
  }

  @GetMapping("/{id}/certificate")
  public ResponseEntity<BatchCertificateResponse> certificate(@PathVariable UUID id) {
    return ResponseEntity.ok(batchReleaseService.getBatchCertificate(id));
  }

  @GetMapping(value = "/{id}/certificate/pdf", produces = "application/pdf")
  public ResponseEntity<byte[]> certificatePdf(@PathVariable UUID id) {
    BatchCertificateResponse cert = batchReleaseService.getBatchCertificate(id);
    byte[] pdf = pdfReportService.generateBatchCertificate(cert, authenticatedActorService.currentActor());
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"batch-certificate-" + cert.getReleaseNumber() + ".pdf\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf);
  }

  @GetMapping("/{id}/coa")
  public ResponseEntity<CoaResponse> getCoaDetails(@PathVariable UUID id) {
    return ResponseEntity.ok(batchReleaseService.getCoaDetails(id));
  }

  @PostMapping("/{id}/coa/analyst-sign")
  public ResponseEntity<CoaResponse> analystSignCoa(
      @PathVariable UUID id,
      @Valid @RequestBody AnalystSignCoaRequest request) {
    String actor = authenticatedActorService.currentActor();
    return ResponseEntity.ok(batchReleaseService.analystSignCoa(id, request, actor));
  }

  @PostMapping("/{id}/coa/issue")
  public ResponseEntity<CoaResponse> issueCoa(
      @PathVariable UUID id,
      @Valid @RequestBody IssueCoaRequest request) {
    String actor = authenticatedActorService.currentActor();
    return ResponseEntity.ok(batchReleaseService.issueCoa(id, request, actor));
  }

  @GetMapping(value = "/{id}/coa/pdf", produces = "application/pdf")
  public ResponseEntity<byte[]> coaPdf(@PathVariable UUID id) {
    String actor = authenticatedActorService.currentActor();
    byte[] pdf = batchReleaseService.getCoaPdf(id, actor);
    CoaResponse coa = batchReleaseService.getCoaDetails(id);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"coa-" + (coa.getCoaNumber() != null ? coa.getCoaNumber() : id) + ".pdf\"")
        .contentType(MediaType.APPLICATION_PDF)
        .body(pdf);
  }
}
