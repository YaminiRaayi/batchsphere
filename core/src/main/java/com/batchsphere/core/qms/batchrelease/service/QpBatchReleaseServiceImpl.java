package com.batchsphere.core.qms.batchrelease.service;

import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.report.PdfReportService;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.qms.batchrelease.dto.QpBatchReleaseDTO.*;
import com.batchsphere.core.qms.batchrelease.entity.BatchReleaseStatus;
import com.batchsphere.core.qms.batchrelease.entity.QpBatchRelease;
import com.batchsphere.core.qms.batchrelease.repository.QpBatchReleaseRepository;
import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import com.batchsphere.core.qms.deviation.entity.DeviationStatus;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import com.batchsphere.core.transactions.grn.entity.CoaReviewStatus;
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.repository.GrnDocumentRepository;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.repository.QcDispositionRepository;
import com.batchsphere.core.transactions.sampling.repository.QcInvestigationRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
import com.batchsphere.core.transactions.sampling.service.QcWorksheetService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QpBatchReleaseServiceImpl implements QpBatchReleaseService {

  private static final String ENTITY_TYPE = "QP_BATCH_RELEASE";

  private final QpBatchReleaseRepository batchReleaseRepository;
  private final MaterialRepository materialRepository;
  private final GrnRepository grnRepository;
  private final GrnItemRepository grnItemRepository;
  private final GrnDocumentRepository grnDocumentRepository;
  private final QcDispositionRepository qcDispositionRepository;
  private final QcInvestigationRepository qcInvestigationRepository;
  private final SamplingRequestRepository samplingRequestRepository;
  private final QcWorksheetService qcWorksheetService;
  private final DeviationRepository deviationRepository;
  private final AuthenticatedActorService actorService;
  private final ESignatureService eSignatureService;
  private final AuditEventService auditEventService;
  private final PdfReportService pdfReportService;

  @Override
  @Transactional
  public QpBatchReleaseResponse createBatchRelease(CreateQpBatchReleaseRequest request) {
    String actor = actorService.currentActor();
    UUID materialId = request.getMaterialId();
    UUID grnId = request.getGrnId();

    if (materialId != null && !materialRepository.existsById(materialId)) {
      throw new ResourceNotFoundException("Material not found: " + materialId);
    }
    if (grnId != null && !grnRepository.existsById(grnId)) {
      throw new ResourceNotFoundException("GRN not found: " + grnId);
    }

    GrnItem sourceItem = findSourceItem(request.getLotNumber(), materialId, grnId);
    if (sourceItem != null) {
      if (materialId == null) materialId = sourceItem.getMaterialId();
      if (grnId == null) grnId = sourceItem.getGrnId();
    }

    Checklist checklist = calculateChecklist(request.getLotNumber(), materialId, grnId);
    QpBatchRelease release = QpBatchRelease.builder()
        .lotNumber(request.getLotNumber().trim())
        .productName(request.getProductName().trim())
        .materialId(materialId)
        .grnId(grnId)
        .batchSize(request.getBatchSize() != null ? request.getBatchSize() : sourceItem != null ? sourceItem.getAcceptedQuantity() : null)
        .batchUom(StringUtils.hasText(request.getBatchUom()) ? request.getBatchUom().trim() : sourceItem != null ? sourceItem.getUom() : null)
        .manufactureDate(request.getManufactureDate() != null ? request.getManufactureDate() : sourceItem != null ? sourceItem.getManufactureDate() : null)
        .expiryDate(request.getExpiryDate() != null ? request.getExpiryDate() : sourceItem != null ? sourceItem.getExpiryDate() : null)
        .status(BatchReleaseStatus.PENDING_QP_REVIEW)
        .qcDispositionConfirmed(checklist.qcDispositionConfirmed())
        .oosInvestigationsClosed(checklist.oosInvestigationsClosed())
        .noOpenCriticalDeviations(checklist.noOpenCriticalDeviations())
        .documentsComplete(checklist.documentsComplete())
        .isActive(true)
        .createdBy(actor)
        .build();

    release = batchReleaseRepository.save(release);
    auditEventService.record(ENTITY_TYPE, release.getId(), AuditEventType.CREATE, null, null, release.getReleaseNumber(), null, actor, "APPLICATION");
    return toResponse(release);
  }

  @Override
  @Transactional(readOnly = true)
  public QpBatchReleaseResponse getBatchRelease(UUID id) {
    return toResponse(findActive(id));
  }

  @Override
  @Transactional(readOnly = true)
  public Page<QpBatchReleaseResponse> listBatchReleases(BatchReleaseStatus status, UUID materialId, Pageable pageable) {
    Page<QpBatchRelease> releases;
    if (status != null && materialId != null) {
      releases = batchReleaseRepository.findByStatusAndMaterialIdAndIsActiveTrue(status, materialId, pageable);
    } else if (status != null) {
      releases = batchReleaseRepository.findByStatusAndIsActiveTrue(status, pageable);
    } else if (materialId != null) {
      releases = batchReleaseRepository.findByMaterialIdAndIsActiveTrue(materialId, pageable);
    } else {
      releases = batchReleaseRepository.findByIsActiveTrue(pageable);
    }
    return releases.map(this::toResponse);
  }

  @Override
  @Transactional
  public QpBatchReleaseResponse certifyBatch(UUID id, CertifyBatchRequest request) {
    QpBatchRelease release = findActive(id);
    if (release.getStatus() == BatchReleaseStatus.CERTIFIED) {
      throw new BusinessConflictException("Batch release is already certified");
    }
    if (release.getStatus() == BatchReleaseStatus.REJECTED) {
      throw new BusinessConflictException("Rejected batch release cannot be certified");
    }
    if (!allChecklistItemsPass(release)) {
      throw new BusinessConflictException("Batch release checklist is incomplete");
    }

    UserRole role = actorService.currentRole();
    if (role != UserRole.QC_MANAGER && role != UserRole.SUPER_ADMIN) {
      throw new BusinessConflictException("QP batch certification requires QC_MANAGER authority");
    }
    if (!StringUtils.hasText(request.getPassword())) {
      throw new BusinessConflictException("Electronic signature password is required for QP batch certification");
    }

    String actor = actorService.currentActor();
    ESignatureRequest signatureRequest = new ESignatureRequest();
    signatureRequest.setUsername(request.getUsername());
    signatureRequest.setPassword(request.getPassword());
    signatureRequest.setMeaning(request.getMeaning());

    ESignatureRecordResponse signature = eSignatureService.sign(
        ENTITY_TYPE,
        id,
        "QP_BATCH_CERTIFICATION",
        "I certify this batch for release according to EU GMP Annex 16",
        actor,
        signatureRequest,
        request.getReason());

    release.setStatus(BatchReleaseStatus.CERTIFIED);
    release.setQpName(StringUtils.hasText(request.getQpName()) ? request.getQpName().trim() : actor);
    release.setQpEmployeeId(request.getQpEmployeeId());
    release.setQpCertificationStatement(StringUtils.hasText(request.getCertificationStatement())
        ? request.getCertificationStatement().trim()
        : "Certified for release in accordance with EU GMP Annex 16 after review of QC disposition, investigations, deviations, and documentation.");
    release.setCertifiedAt(LocalDateTime.now());
    release.setCertificationESignatureId(signature.getId());
    release.setUpdatedBy(actor);
    release.setUpdatedAt(LocalDateTime.now());

    release = batchReleaseRepository.save(release);
    auditEventService.record(ENTITY_TYPE, release.getId(), AuditEventType.E_SIGNATURE, "status", BatchReleaseStatus.PENDING_QP_REVIEW.name(), BatchReleaseStatus.CERTIFIED.name(), request.getReason(), actor, "APPLICATION");
    return toResponse(release);
  }

  @Override
  @Transactional
  public QpBatchReleaseResponse rejectBatch(UUID id, RejectBatchRequest request) {
    QpBatchRelease release = findActive(id);
    if (release.getStatus() == BatchReleaseStatus.CERTIFIED) {
      throw new BusinessConflictException("Certified batch release cannot be rejected");
    }

    String actor = actorService.currentActor();
    BatchReleaseStatus oldStatus = release.getStatus();
    release.setStatus(BatchReleaseStatus.REJECTED);
    release.setRejectionReason(request.getReason().trim());
    release.setUpdatedBy(actor);
    release.setUpdatedAt(LocalDateTime.now());

    release = batchReleaseRepository.save(release);
    auditEventService.record(ENTITY_TYPE, release.getId(), AuditEventType.STATUS_CHANGE, "status", oldStatus.name(), BatchReleaseStatus.REJECTED.name(), request.getReason(), actor, "APPLICATION");
    return toResponse(release);
  }

  @Override
  @Transactional(readOnly = true)
  public BatchCertificateResponse getBatchCertificate(UUID id) {
    QpBatchRelease release = findActive(id);
    return BatchCertificateResponse.builder()
        .id(release.getId())
        .releaseNumber(release.getReleaseNumber())
        .lotNumber(release.getLotNumber())
        .productName(release.getProductName())
        .materialId(release.getMaterialId())
        .grnId(release.getGrnId())
        .batchSize(release.getBatchSize())
        .batchUom(release.getBatchUom())
        .manufactureDate(release.getManufactureDate())
        .expiryDate(release.getExpiryDate())
        .status(release.getStatus())
        .qcDispositionSummary(release.getQcDispositionConfirmed() ? "QC disposition approved for release." : "QC disposition is not approved.")
        .investigationSummary(release.getOosInvestigationsClosed() ? "No open OOS investigations remain for the lot." : "Open OOS investigations remain.")
        .deviationSummary(release.getNoOpenCriticalDeviations() ? "No open critical deviations linked to the lot." : "Open critical deviations require resolution.")
        .documentSummary(release.getDocumentsComplete() ? "GRN and batch documentation are complete." : "Batch documentation is incomplete.")
        .qpName(release.getQpName())
        .certificationStatement(release.getQpCertificationStatement())
        .certifiedAt(release.getCertifiedAt())
        .eSignatureId(release.getCertificationESignatureId())
        .coaNumber(release.getCoaNumber())
        .analystSignedBy(release.getAnalystSignedBy())
        .analystSignedAt(release.getAnalystSignedAt())
        .coaIssuedBy(release.getCoaIssuedBy())
        .coaIssuedAt(release.getCoaIssuedAt())
        .testResults(buildCoaResultRows(release))
        .build();
  }

  private QpBatchRelease findActive(UUID id) {
    return batchReleaseRepository.findByIdAndIsActiveTrue(id)
        .orElseThrow(() -> new ResourceNotFoundException("QP batch release not found: " + id));
  }

  private GrnItem findSourceItem(String lotNumber, UUID materialId, UUID grnId) {
    if (grnId != null) {
      return grnItemRepository.findFirstByVendorBatchAndGrnIdAndIsActiveTrueOrderByCreatedAtDesc(lotNumber, grnId).orElse(null);
    }
    if (materialId != null) {
      return grnItemRepository.findFirstByVendorBatchAndMaterialIdAndIsActiveTrueOrderByCreatedAtDesc(lotNumber, materialId).orElse(null);
    }
    return null;
  }

  private Checklist calculateChecklist(String lotNumber, UUID materialId, UUID grnId) {
    boolean qcReleased = qcDispositionRepository.existsReleasedDispositionForLot(lotNumber, materialId, grnId, QcDispositionStatus.APPROVED);
    List<QcInvestigationStatus> openInvestigationStatuses = List.of(
        QcInvestigationStatus.PHASE_I,
        QcInvestigationStatus.PHASE_II,
        QcInvestigationStatus.QA_REVIEW_PENDING);
    boolean oosClosed = qcInvestigationRepository.countOpenInvestigationsForLot(lotNumber, materialId, grnId, QcInvestigationType.OOS, openInvestigationStatuses) == 0;
    boolean noCriticalDeviations = deviationRepository.countOpenCriticalForLot(
        lotNumber,
        grnId,
        DeviationSeverity.CRITICAL,
        List.of(DeviationStatus.OPEN, DeviationStatus.UNDER_INVESTIGATION, DeviationStatus.CAPA_IN_PROGRESS)) == 0;
    boolean documentsComplete = false;
    if (grnId != null) {
      Grn grn = grnRepository.findById(grnId).orElse(null);
      documentsComplete = grn != null
          && grn.getCoaReviewStatus() == CoaReviewStatus.ACCEPTED
          && grnDocumentRepository.existsByGrnIdAndIsActiveTrue(grnId);
    }
    return new Checklist(qcReleased, oosClosed, noCriticalDeviations, documentsComplete);
  }

  private boolean allChecklistItemsPass(QpBatchRelease release) {
    return Boolean.TRUE.equals(release.getQcDispositionConfirmed())
        && Boolean.TRUE.equals(release.getOosInvestigationsClosed())
        && Boolean.TRUE.equals(release.getNoOpenCriticalDeviations())
        && Boolean.TRUE.equals(release.getDocumentsComplete());
  }

  private QpBatchReleaseResponse toResponse(QpBatchRelease release) {
    return QpBatchReleaseResponse.builder()
        .id(release.getId())
        .releaseNumber(release.getReleaseNumber())
        .lotNumber(release.getLotNumber())
        .productName(release.getProductName())
        .materialId(release.getMaterialId())
        .grnId(release.getGrnId())
        .batchSize(release.getBatchSize())
        .batchUom(release.getBatchUom())
        .manufactureDate(release.getManufactureDate())
        .expiryDate(release.getExpiryDate())
        .status(release.getStatus())
        .qcDispositionConfirmed(release.getQcDispositionConfirmed())
        .oosInvestigationsClosed(release.getOosInvestigationsClosed())
        .noOpenCriticalDeviations(release.getNoOpenCriticalDeviations())
        .documentsComplete(release.getDocumentsComplete())
        .qpName(release.getQpName())
        .qpEmployeeId(release.getQpEmployeeId())
        .qpCertificationStatement(release.getQpCertificationStatement())
        .certifiedAt(release.getCertifiedAt())
        .certificationESignatureId(release.getCertificationESignatureId())
        .rejectionReason(release.getRejectionReason())
        .onHoldReason(release.getOnHoldReason())
        .coaNumber(release.getCoaNumber())
        .coaIssuedAt(release.getCoaIssuedAt())
        .coaIssuedBy(release.getCoaIssuedBy())
        .coaLocked(release.getCoaLocked())
        .analystSignedBy(release.getAnalystSignedBy())
        .analystSignedAt(release.getAnalystSignedAt())
        .createdBy(release.getCreatedBy())
        .createdAt(release.getCreatedAt())
        .updatedBy(release.getUpdatedBy())
        .updatedAt(release.getUpdatedAt())
        .build();
  }

  @Override
  @Transactional
  public CoaResponse analystSignCoa(UUID id, AnalystSignCoaRequest request, String actor) {
    QpBatchRelease release = findActive(id);
    if (release.getStatus() != BatchReleaseStatus.CERTIFIED) {
      throw new BusinessConflictException("CoA analyst signature requires batch to be CERTIFIED first");
    }
    if (release.getAnalystSignedBy() != null) {
      throw new BusinessConflictException("CoA has already been signed by analyst");
    }

    ESignatureRequest sig = new ESignatureRequest();
    sig.setUsername(request.getUsername());
    sig.setPassword(request.getPassword());
    sig.setMeaning("I confirm the QC test results are complete and accurate for this CoA");
    eSignatureService.sign(ENTITY_TYPE, release.getId(), "COA_ANALYST_SIGN",
        "Analyst e-signature on CoA", actor, sig, null);

    release.setAnalystSignedBy(actor);
    release.setAnalystSignedAt(LocalDateTime.now());
    release.setUpdatedBy(actor);
    release.setUpdatedAt(LocalDateTime.now());
    batchReleaseRepository.save(release);

    auditEventService.record(ENTITY_TYPE, release.getId(), AuditEventType.WORKFLOW_ACTION,
        "analystSignedBy", null, actor, "Analyst e-signed CoA", actor, "COA_ANALYST_SIGN");

    return toCoaResponse(release);
  }

  @Override
  @Transactional
  public CoaResponse issueCoa(UUID id, IssueCoaRequest request, String actor) {
    QpBatchRelease release = findActive(id);
    if (release.getStatus() != BatchReleaseStatus.CERTIFIED) {
      throw new BusinessConflictException("CoA can only be issued for CERTIFIED batch releases");
    }
    if (release.getAnalystSignedBy() == null) {
      throw new BusinessConflictException("Analyst sign-off required before CoA issuance");
    }
    if (Boolean.TRUE.equals(release.getCoaLocked())) {
      throw new BusinessConflictException("CoA already issued");
    }
    if (!allMandatoryResultsPass(release)) {
      throw new BusinessConflictException("All mandatory results must pass before CoA issuance");
    }

    ESignatureRequest sig = new ESignatureRequest();
    sig.setUsername(request.getUsername());
    sig.setPassword(request.getPassword());
    sig.setMeaning("I authorize the issuance of this Certificate of Analysis");
    eSignatureService.sign(ENTITY_TYPE, release.getId(), "COA_ISSUE",
        "QC Manager issues CoA", actor, sig, null);

    String coaNumber = "COA-" + Year.now(ZoneOffset.UTC) + "-" + String.format("%05d",
        batchReleaseRepository.nextCoaSequenceValue());
    release.setCoaNumber(coaNumber);
    release.setCoaIssuedBy(actor);
    release.setCoaIssuedAt(LocalDateTime.now());
    release.setCoaLocked(true);
    release.setUpdatedBy(actor);
    release.setUpdatedAt(LocalDateTime.now());
    batchReleaseRepository.save(release);

    auditEventService.record(ENTITY_TYPE, release.getId(), AuditEventType.WORKFLOW_ACTION,
        "coaLocked", "false", "true",
        "CoA issued: " + coaNumber, actor, "COA_ISSUE");

    return toCoaResponse(release);
  }

  @Override
  @Transactional(readOnly = true)
  public CoaResponse getCoaDetails(UUID id) {
    return toCoaResponse(findActive(id));
  }

  @Override
  @Transactional(readOnly = true)
  public byte[] getCoaPdf(UUID id, String actor, boolean preview, boolean reprint) {
    QpBatchRelease release = findActive(id);
    if (!preview && release.getCoaNumber() == null) {
      throw new BusinessConflictException("CoA has not been issued yet");
    }
    BatchCertificateResponse cert = getBatchCertificate(id);
    String watermark = reprint
        ? "REPRINT - Originally issued "
            + (release.getCoaIssuedAt() != null ? release.getCoaIssuedAt() : "unknown date")
            + " by " + (release.getCoaIssuedBy() != null ? release.getCoaIssuedBy() : "unknown")
        : (preview ? "PREVIEW - NOT ISSUED" : null);
    if (reprint) {
      auditEventService.record(ENTITY_TYPE, release.getId(), AuditEventType.WORKFLOW_ACTION,
          "coaReprint", null, release.getCoaNumber(), "CoA reprint generated", actor, "COA_REPRINT");
    }
    return pdfReportService.generateCoa(cert, actor, preview, watermark);
  }

  private boolean allMandatoryResultsPass(QpBatchRelease release) {
    return buildCoaResultRows(release).stream()
        .allMatch(row -> "PASS".equalsIgnoreCase(row.getPassFail()));
  }

  private List<CoaResultRow> buildCoaResultRows(QpBatchRelease release) {
    List<CoaResultRow> rows = new ArrayList<>();
    if (release.getGrnId() == null) {
      return rows;
    }
    for (SamplingRequest request : samplingRequestRepository.findByGrnIdAndIsActiveTrue(release.getGrnId())) {
      List<QcTestResultResponse> worksheet;
      try {
        worksheet = qcWorksheetService.getWorksheet(request.getId());
      } catch (RuntimeException ignored) {
        continue;
      }
      for (QcTestResultResponse row : worksheet) {
        if (!Boolean.TRUE.equals(row.getMandatory())) {
          continue;
        }
        String result = row.getResultValue() != null
            ? row.getResultValue().stripTrailingZeros().toPlainString()
            : row.getResultText();
        rows.add(CoaResultRow.builder()
            .parameterName(row.getParameterName())
            .criteriaDisplay(row.getCriteriaDisplay())
            .result(result != null ? result : "-")
            .unit(row.getUnitApplied())
            .passFail(row.getStatus() == QcTestResultStatus.PASS ? "PASS" : row.getStatus().name())
            .instrumentRef(row.getInstrumentRef())
            .build());
      }
    }
    return rows;
  }

  private CoaResponse toCoaResponse(QpBatchRelease r) {
    return CoaResponse.builder()
        .id(r.getId())
        .releaseNumber(r.getReleaseNumber())
        .coaNumber(r.getCoaNumber())
        .lotNumber(r.getLotNumber())
        .productName(r.getProductName())
        .batchSize(r.getBatchSize())
        .batchUom(r.getBatchUom())
        .manufactureDate(r.getManufactureDate())
        .expiryDate(r.getExpiryDate())
        .status(r.getStatus())
        .analystSignedBy(r.getAnalystSignedBy())
        .analystSignedAt(r.getAnalystSignedAt())
        .coaIssuedBy(r.getCoaIssuedBy())
        .coaIssuedAt(r.getCoaIssuedAt())
        .coaLocked(r.getCoaLocked())
        .build();
  }

  private record Checklist(
      boolean qcDispositionConfirmed,
      boolean oosInvestigationsClosed,
      boolean noOpenCriticalDeviations,
      boolean documentsComplete) {
  }
}
