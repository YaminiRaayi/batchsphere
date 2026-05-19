package com.batchsphere.core.qms.apqr.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.qms.apqr.dto.ApqrDTO.*;
import com.batchsphere.core.qms.apqr.entity.Apqr;
import com.batchsphere.core.qms.apqr.entity.Apqr.ApqrStatus;
import com.batchsphere.core.qms.apqr.repository.ApqrRepository;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.changecontrol.repository.ChangeControlRepository;
import com.batchsphere.core.qms.complaint.repository.ComplaintRepository;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import com.batchsphere.core.transactions.sampling.repository.QcInvestigationRepository;
import com.batchsphere.core.transactions.sampling.repository.QcTestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApqrServiceImpl implements ApqrService {

  private final ApqrRepository apqrRepository;
  private final MaterialRepository materialRepository;
  private final AuthenticatedActorService actorService;
  private final ESignatureService eSignatureService;
  private final AuditEventService auditEventService;
  private final GrnItemRepository grnItemRepository;
  private final QcTestResultRepository qcTestResultRepository;
  private final QcInvestigationRepository qcInvestigationRepository;
  private final DeviationRepository deviationRepository;
  private final CapaRepository capaRepository;
  private final ChangeControlRepository changeControlRepository;
  private final ComplaintRepository complaintRepository;

  @Override
  @Transactional
  public ApqrResponse createApqr(CreateApqrRequest request) {
    String actor = actorService.currentActor();
    if (request.getMaterialId() != null && !materialRepository.existsById(request.getMaterialId())) {
      throw new ResourceNotFoundException("Material not found: " + request.getMaterialId());
    }

    Apqr apqr = Apqr.builder()
        .productName(request.getProductName())
        .materialId(request.getMaterialId())
        .reviewYear(request.getReviewYear())
        .periodStart(request.getPeriodStart())
        .periodEnd(request.getPeriodEnd())
        .status(ApqrStatus.DRAFT)
        .totalBatchesManufactured(0)
        .totalGrnReceived(0)
        .grnRejectionCount(0)
        .oosCount(0)
        .ootCount(0)
        .deviationCount(0)
        .openCapaCount(0)
        .changeControlCount(0)
        .complaintCount(0)
        .isActive(true)
        .createdBy(actor)
        .build();

    apqr = apqrRepository.save(apqr);
    auditEventService.record("APQR", apqr.getId(), AuditEventType.CREATE, "status",
        null, ApqrStatus.DRAFT.name(), apqr.getApqrNumber(), actor, "APQR");
    return toResponse(apqr);
  }

  @Override
  @Transactional(readOnly = true)
  public ApqrResponse getApqr(UUID id) {
    Apqr apqr = apqrRepository.findByIdAndIsActiveTrue(id)
        .orElseThrow(() -> new ResourceNotFoundException("APQR not found: " + id));
    return toResponse(apqr);
  }

  @Override
  @Transactional(readOnly = true)
  public Page<ApqrResponse> listApqrs(Integer year, UUID materialId, ApqrStatus status, Pageable pageable) {
    Page<Apqr> apqrs;
    if (year != null) {
      apqrs = apqrRepository.findByReviewYearAndIsActiveTrue(year, pageable);
    } else if (materialId != null) {
      apqrs = apqrRepository.findByMaterialIdAndIsActiveTrue(materialId, pageable);
    } else if (status != null) {
      apqrs = apqrRepository.findByStatusAndIsActiveTrue(status, pageable);
    } else {
      apqrs = apqrRepository.findByIsActiveTrue(pageable);
    }
    return apqrs.map(this::toResponse);
  }

  @Override
  @Transactional
  public ApqrResponse compileApqr(UUID id) {
    Apqr apqr = apqrRepository.findByIdAndIsActiveTrue(id)
        .orElseThrow(() -> new ResourceNotFoundException("APQR not found: " + id));

    if (apqr.getStatus() != ApqrStatus.DRAFT) {
      throw new IllegalStateException("Can only compile DRAFT APQR");
    }

    LocalDateTime start = apqr.getPeriodStart().atStartOfDay();
    LocalDateTime end = apqr.getPeriodEnd().atTime(LocalTime.MAX);
    UUID materialId = apqr.getMaterialId();
    if (materialId != null) {
      apqr.setTotalGrnReceived(toInt(grnItemRepository.countReceivedItemsForApqr(materialId, apqr.getPeriodStart(), apqr.getPeriodEnd())));
      apqr.setGrnRejectionCount(toInt(grnItemRepository.countRejectedItemsForApqr(materialId, apqr.getPeriodStart(), apqr.getPeriodEnd())));
      apqr.setTotalBatchesManufactured(toInt(grnItemRepository.countDistinctBatchesForApqr(materialId, apqr.getPeriodStart(), apqr.getPeriodEnd())));
      apqr.setOosCount(toInt(qcTestResultRepository.countByMaterialAndStatusForApqr(materialId, QcTestResultStatus.OOS, start, end)));
      apqr.setOotCount(toInt(qcInvestigationRepository.countByMaterialAndTypeForApqr(materialId, QcInvestigationType.OOT, start, end)));
    }
    apqr.setDeviationCount(toInt(deviationRepository.countByCreatedAtBetween(start, end)));
    apqr.setOpenCapaCount(capaRepository.findByIsActiveTrueAndStatusNotIn(Set.of(CapaStatus.CLOSED, CapaStatus.CANCELLED)).size());
    apqr.setChangeControlCount(toInt(changeControlRepository.countByIsActiveTrueAndCreatedAtBetween(start, end)));
    apqr.setComplaintCount(toInt(complaintRepository.countByProductNameForApqr(apqr.getProductName(), apqr.getPeriodStart(), apqr.getPeriodEnd())));
    ApqrStatus oldStatus = apqr.getStatus();
    apqr.setStatus(ApqrStatus.UNDER_REVIEW);

    String actor = actorService.currentActor();
    apqr.setPreparedBy(actor);
    apqr.setPreparedAt(LocalDateTime.now());

    apqr = apqrRepository.save(apqr);
    auditEventService.record("APQR", apqr.getId(), AuditEventType.STATUS_CHANGE, "status",
        oldStatus.name(), ApqrStatus.UNDER_REVIEW.name(), "APQR compiled", actor, "APQR");
    return toResponse(apqr);
  }

  @Override
  @Transactional
  public ApqrResponse updateConclusions(UUID id, ApqrConclusionRequest request) {
    Apqr apqr = apqrRepository.findByIdAndIsActiveTrue(id)
        .orElseThrow(() -> new ResourceNotFoundException("APQR not found: " + id));

    if (apqr.getStatus() != ApqrStatus.UNDER_REVIEW) {
      throw new IllegalStateException("Can only update conclusions for UNDER_REVIEW APQR");
    }

    apqr.setProcessInControl(request.getProcessInControl());
    apqr.setTrendsIdentified(request.getTrendsIdentified());
    apqr.setRecommendations(request.getRecommendations());

    String actor = actorService.currentActor();
    apqr.setUpdatedBy(actor);
    apqr.setUpdatedAt(LocalDateTime.now());

    apqr = apqrRepository.save(apqr);
    auditEventService.record("APQR", apqr.getId(), AuditEventType.UPDATE, "conclusions",
        null, "UPDATED", "APQR conclusions updated", actor, "APQR");
    return toResponse(apqr);
  }

  @Override
  @Transactional
  public ApqrResponse approveApqr(UUID id, ApproveApqrRequest request) {
    Apqr apqr = apqrRepository.findByIdAndIsActiveTrue(id)
        .orElseThrow(() -> new ResourceNotFoundException("APQR not found: " + id));

    if (apqr.getStatus() != ApqrStatus.UNDER_REVIEW) {
      throw new IllegalStateException("Can only approve UNDER_REVIEW APQR");
    }

    String actor = actorService.currentActor();
    ESignatureRequest signatureRequest = new ESignatureRequest();
    signatureRequest.setUsername(request.getUsername());
    signatureRequest.setPassword(request.getPassword());
    signatureRequest.setMeaning(request.getMeaning());

    ESignatureRecordResponse signature = eSignatureService.sign(
        "APQR",
        id,
        "APQR_APPROVAL",
        "I approve this Annual Product Quality Review",
        actor,
        signatureRequest,
        request.getReason());

    apqr.setApprovedBy(actor);
    apqr.setApprovedAt(LocalDateTime.now());
    apqr.setApprovalESignatureId(signature.getId());
    ApqrStatus oldStatus = apqr.getStatus();
    apqr.setStatus(ApqrStatus.APPROVED);
    apqr.setUpdatedBy(actor);
    apqr.setUpdatedAt(LocalDateTime.now());

    apqr = apqrRepository.save(apqr);
    auditEventService.record("APQR", apqr.getId(), AuditEventType.E_SIGNATURE, "approvalESignatureId",
        null, signature.getId().toString(), request.getReason(), actor, "APQR");
    auditEventService.record("APQR", apqr.getId(), AuditEventType.STATUS_CHANGE, "status",
        oldStatus.name(), ApqrStatus.APPROVED.name(), request.getReason(), actor, "APQR");
    return toResponse(apqr);
  }

  @Override
  @Transactional
  public ApqrResponse closeApqr(UUID id) {
    Apqr apqr = apqrRepository.findByIdAndIsActiveTrue(id)
        .orElseThrow(() -> new ResourceNotFoundException("APQR not found: " + id));

    if (apqr.getStatus() != ApqrStatus.APPROVED) {
      throw new IllegalStateException("Can only close APPROVED APQR");
    }

    ApqrStatus oldStatus = apqr.getStatus();
    apqr.setStatus(ApqrStatus.CLOSED);
    String actor = actorService.currentActor();
    apqr.setUpdatedBy(actor);
    apqr.setUpdatedAt(LocalDateTime.now());

    apqr = apqrRepository.save(apqr);
    auditEventService.record("APQR", apqr.getId(), AuditEventType.STATUS_CHANGE, "status",
        oldStatus.name(), ApqrStatus.CLOSED.name(), "APQR closed", actor, "APQR");
    return toResponse(apqr);
  }

  @Override
  @Transactional(readOnly = true)
  public List<ApqrSummaryItem> getApqrSummary() {
    return apqrRepository.findAllActiveSummaries().stream()
        .map(row -> ApqrSummaryItem.builder()
            .materialId((UUID) row[0])
            .productName((String) row[1])
            .reviewYear((Integer) row[2])
            .status((ApqrStatus) row[3])
            .totalBatches((Integer) row[4])
            .oosCount((Integer) row[5])
            .deviationCount((Integer) row[6])
            .openCapaCount((Integer) row[7])
            .build())
        .collect(Collectors.toList());
  }

  @Override
  @Transactional(readOnly = true)
  public List<ApqrResponse> getApqrsInProgress() {
    return apqrRepository.findInProgressApqrs().stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  private ApqrResponse toResponse(Apqr apqr) {
    return ApqrResponse.builder()
        .id(apqr.getId())
        .apqrNumber(apqr.getApqrNumber())
        .productName(apqr.getProductName())
        .materialId(apqr.getMaterialId())
        .reviewYear(apqr.getReviewYear())
        .periodStart(apqr.getPeriodStart())
        .periodEnd(apqr.getPeriodEnd())
        .status(apqr.getStatus())
        .totalBatchesManufactured(apqr.getTotalBatchesManufactured())
        .totalGrnReceived(apqr.getTotalGrnReceived())
        .grnRejectionCount(apqr.getGrnRejectionCount())
        .oosCount(apqr.getOosCount())
        .ootCount(apqr.getOotCount())
        .deviationCount(apqr.getDeviationCount())
        .openCapaCount(apqr.getOpenCapaCount())
        .changeControlCount(apqr.getChangeControlCount())
        .complaintCount(apqr.getComplaintCount())
        .processInControl(apqr.getProcessInControl())
        .trendsIdentified(apqr.getTrendsIdentified())
        .recommendations(apqr.getRecommendations())
        .preparedBy(apqr.getPreparedBy())
        .preparedAt(apqr.getPreparedAt())
        .reviewedBy(apqr.getReviewedBy())
        .reviewedAt(apqr.getReviewedAt())
        .approvedBy(apqr.getApprovedBy())
        .approvedAt(apqr.getApprovedAt())
        .approvalESignatureId(apqr.getApprovalESignatureId())
        .createdBy(apqr.getCreatedBy())
        .createdAt(apqr.getCreatedAt())
        .updatedBy(apqr.getUpdatedBy())
        .updatedAt(apqr.getUpdatedAt())
        .build();
  }

  private int toInt(long value) {
    return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
  }
}
