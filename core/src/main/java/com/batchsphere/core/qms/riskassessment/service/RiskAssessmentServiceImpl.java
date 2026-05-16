package com.batchsphere.core.qms.riskassessment.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.riskassessment.dto.AcceptRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.CreateRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.CreateRiskItemRequest;
import com.batchsphere.core.qms.riskassessment.dto.RiskAssessmentResponse;
import com.batchsphere.core.qms.riskassessment.dto.RiskAssessmentSummaryResponse;
import com.batchsphere.core.qms.riskassessment.dto.RiskItemResponse;
import com.batchsphere.core.qms.riskassessment.dto.UpdateRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.UpdateRiskItemRequest;
import com.batchsphere.core.qms.riskassessment.entity.RiskAssessment;
import com.batchsphere.core.qms.riskassessment.entity.RiskAssessmentStatus;
import com.batchsphere.core.qms.riskassessment.entity.RiskItem;
import com.batchsphere.core.qms.riskassessment.repository.RiskAssessmentRepository;
import com.batchsphere.core.qms.riskassessment.repository.RiskItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RiskAssessmentServiceImpl implements RiskAssessmentService {

    private static final DateTimeFormatter NUMBER_YEAR = DateTimeFormatter.ofPattern("yyyy");

    private final RiskAssessmentRepository riskAssessmentRepository;
    private final RiskItemRepository riskItemRepository;
    private final CapaRepository capaRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public RiskAssessmentResponse createRiskAssessment(CreateRiskAssessmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        OffsetDateTime now = OffsetDateTime.now();

        RiskAssessment assessment = RiskAssessment.builder()
                .id(UUID.randomUUID())
                .assessmentNumber(nextAssessmentNumber())
                .title(request.getTitle().trim())
                .scope(request.getScope())
                .scopeEntityType(blankToNull(request.getScopeEntityType()))
                .scopeEntityId(request.getScopeEntityId())
                .scopeEntityDisplay(blankToNull(request.getScopeEntityDisplay()))
                .status(RiskAssessmentStatus.DRAFT)
                .methodology(StringUtils.hasText(request.getMethodology()) ? request.getMethodology().trim() : "FMEA")
                .preparedBy(actor)
                .nextReviewDate(request.getNextReviewDate())
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        RiskAssessment saved = riskAssessmentRepository.save(assessment);
        auditEventService.record(
                "RISK_ASSESSMENT",
                saved.getId(),
                AuditEventType.CREATE,
                "status",
                null,
                saved.getStatus().name(),
                saved.getAssessmentNumber(),
                actor,
                "RISK_ASSESSMENT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RiskAssessmentResponse> getAllRiskAssessments(Pageable pageable) {
        return riskAssessmentRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public RiskAssessmentResponse getRiskAssessmentById(UUID id) {
        return toResponse(getActiveAssessment(id));
    }

    @Override
    @Transactional
    public RiskAssessmentResponse updateRiskAssessment(UUID id, UpdateRiskAssessmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        RiskAssessment assessment = getActiveAssessment(id);
        if (assessment.getStatus() == RiskAssessmentStatus.ACCEPTED || assessment.getStatus() == RiskAssessmentStatus.CLOSED) {
            throw new BusinessConflictException("Accepted or closed risk assessments cannot be edited");
        }

        assessment.setTitle(request.getTitle().trim());
        assessment.setScopeEntityType(blankToNull(request.getScopeEntityType()));
        assessment.setScopeEntityId(request.getScopeEntityId());
        assessment.setScopeEntityDisplay(blankToNull(request.getScopeEntityDisplay()));
        if (StringUtils.hasText(request.getMethodology())) {
            assessment.setMethodology(request.getMethodology().trim());
        }
        assessment.setNextReviewDate(request.getNextReviewDate());
        assessment.setReviewedBy(blankToNull(request.getReviewedBy()));
        assessment.setResidualRiskAcceptable(request.getResidualRiskAcceptable());
        assessment.setOverallRiskConclusion(blankToNull(request.getOverallRiskConclusion()));
        assessment.setUpdatedBy(actor);
        assessment.setUpdatedAt(OffsetDateTime.now());

        RiskAssessment saved = riskAssessmentRepository.save(assessment);
        auditEventService.record(
                "RISK_ASSESSMENT",
                saved.getId(),
                AuditEventType.UPDATE,
                "details",
                null,
                "UPDATED",
                "Risk assessment details updated",
                actor,
                "RISK_ASSESSMENT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    public RiskItemResponse addRiskItem(UUID assessmentId, CreateRiskItemRequest request) {
        String actor = authenticatedActorService.currentActor();
        RiskAssessment assessment = getActiveAssessment(assessmentId);
        if (assessment.getStatus() == RiskAssessmentStatus.ACCEPTED || assessment.getStatus() == RiskAssessmentStatus.CLOSED) {
            throw new BusinessConflictException("Cannot add items to an accepted or closed risk assessment");
        }

        if (request.getLinkedCapaId() != null && !capaRepository.existsById(request.getLinkedCapaId())) {
            throw new ResourceNotFoundException("CAPA not found: " + request.getLinkedCapaId());
        }

        int nextSeq = riskItemRepository.countByRiskAssessmentIdAndIsActiveTrue(assessmentId) + 1;
        OffsetDateTime now = OffsetDateTime.now();

        RiskItem item = RiskItem.builder()
                .id(UUID.randomUUID())
                .riskAssessmentId(assessmentId)
                .sequenceNumber(nextSeq)
                .processStep(blankToNull(request.getProcessStep()))
                .failureMode(request.getFailureMode().trim())
                .failureEffect(request.getFailureEffect().trim())
                .failureCause(request.getFailureCause().trim())
                .currentControls(blankToNull(request.getCurrentControls()))
                .probability(request.getProbability())
                .severity(request.getSeverity())
                .detectability(request.getDetectability())
                .riskControlType(request.getRiskControlType())
                .proposedAction(blankToNull(request.getProposedAction()))
                .actionOwner(blankToNull(request.getActionOwner()))
                .actionDueDate(request.getActionDueDate())
                .linkedCapaId(request.getLinkedCapaId())
                .residualProbability(request.getResidualProbability())
                .residualSeverity(request.getResidualSeverity())
                .residualDetectability(request.getResidualDetectability())
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        RiskItem saved = riskItemRepository.save(item);
        riskItemRepository.flush();
        saved = riskItemRepository.findById(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Risk item not found after save"));

        auditEventService.record(
                "RISK_ITEM",
                saved.getId(),
                AuditEventType.CREATE,
                "rpn",
                null,
                String.valueOf(saved.getRpn()),
                "Risk item added to " + assessment.getAssessmentNumber(),
                actor,
                "RISK_ASSESSMENT"
        );
        return toItemResponse(saved);
    }

    @Override
    @Transactional
    public RiskItemResponse updateRiskItem(UUID assessmentId, UUID itemId, UpdateRiskItemRequest request) {
        String actor = authenticatedActorService.currentActor();
        RiskAssessment assessment = getActiveAssessment(assessmentId);
        if (assessment.getStatus() == RiskAssessmentStatus.ACCEPTED || assessment.getStatus() == RiskAssessmentStatus.CLOSED) {
            throw new BusinessConflictException("Cannot update items in an accepted or closed risk assessment");
        }

        RiskItem item = riskItemRepository.findById(itemId)
                .filter(ri -> ri.getRiskAssessmentId().equals(assessmentId) && Boolean.TRUE.equals(ri.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Risk item not found: " + itemId));

        if (request.getLinkedCapaId() != null && !capaRepository.existsById(request.getLinkedCapaId())) {
            throw new ResourceNotFoundException("CAPA not found: " + request.getLinkedCapaId());
        }

        item.setProcessStep(blankToNull(request.getProcessStep()));
        item.setFailureMode(request.getFailureMode().trim());
        item.setFailureEffect(request.getFailureEffect().trim());
        item.setFailureCause(request.getFailureCause().trim());
        item.setCurrentControls(blankToNull(request.getCurrentControls()));
        item.setProbability(request.getProbability());
        item.setSeverity(request.getSeverity());
        item.setDetectability(request.getDetectability());
        item.setRiskControlType(request.getRiskControlType());
        item.setProposedAction(blankToNull(request.getProposedAction()));
        item.setActionOwner(blankToNull(request.getActionOwner()));
        item.setActionDueDate(request.getActionDueDate());
        item.setLinkedCapaId(request.getLinkedCapaId());
        item.setResidualProbability(request.getResidualProbability());
        item.setResidualSeverity(request.getResidualSeverity());
        item.setResidualDetectability(request.getResidualDetectability());
        item.setUpdatedBy(actor);
        item.setUpdatedAt(OffsetDateTime.now());

        riskItemRepository.save(item);
        riskItemRepository.flush();
        RiskItem saved = riskItemRepository.findById(item.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Risk item not found after save"));

        auditEventService.record(
                "RISK_ITEM",
                saved.getId(),
                AuditEventType.UPDATE,
                "rpn",
                null,
                String.valueOf(saved.getRpn()),
                "Risk item updated in " + assessment.getAssessmentNumber(),
                actor,
                "RISK_ASSESSMENT"
        );
        return toItemResponse(saved);
    }

    @Override
    @Transactional
    public void deleteRiskItem(UUID assessmentId, UUID itemId) {
        String actor = authenticatedActorService.currentActor();
        RiskAssessment assessment = getActiveAssessment(assessmentId);
        if (assessment.getStatus() == RiskAssessmentStatus.ACCEPTED || assessment.getStatus() == RiskAssessmentStatus.CLOSED) {
            throw new BusinessConflictException("Cannot delete items from an accepted or closed risk assessment");
        }

        RiskItem item = riskItemRepository.findById(itemId)
                .filter(ri -> ri.getRiskAssessmentId().equals(assessmentId) && Boolean.TRUE.equals(ri.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Risk item not found: " + itemId));

        item.setIsActive(false);
        item.setUpdatedBy(actor);
        item.setUpdatedAt(OffsetDateTime.now());
        riskItemRepository.save(item);

        auditEventService.record(
                "RISK_ITEM",
                item.getId(),
                AuditEventType.UPDATE,
                "isActive",
                "true",
                "false",
                "Risk item soft-deleted from " + assessment.getAssessmentNumber(),
                actor,
                "RISK_ASSESSMENT"
        );
    }

    @Override
    @Transactional
    public RiskAssessmentResponse acceptRiskAssessment(UUID id, AcceptRiskAssessmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        RiskAssessment assessment = getActiveAssessment(id);

        if (assessment.getStatus() != RiskAssessmentStatus.UNDER_REVIEW) {
            throw new BusinessConflictException("Risk assessment must be in UNDER_REVIEW status to accept");
        }

        ESignatureRequest signatureRequest = new ESignatureRequest();
        signatureRequest.setUsername(request.getUsername());
        signatureRequest.setPassword(request.getPassword());
        signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning())
                ? request.getMeaning()
                : "I accept the risk assessment and approve residual risk");

        ESignatureRecordResponse signature = eSignatureService.sign(
                "RISK_ASSESSMENT",
                assessment.getId(),
                "ACCEPT_RISK_ASSESSMENT",
                signatureRequest.getMeaning(),
                actor,
                signatureRequest,
                request.getReason()
        );

        RiskAssessmentStatus oldStatus = assessment.getStatus();
        assessment.setStatus(RiskAssessmentStatus.ACCEPTED);
        assessment.setAcceptedBy(actor);
        assessment.setAcceptedAt(OffsetDateTime.now());
        assessment.setAcceptanceESignatureId(signature.getId());
        if (request.getResidualRiskAcceptable() != null) {
            assessment.setResidualRiskAcceptable(request.getResidualRiskAcceptable());
        }
        if (StringUtils.hasText(request.getOverallRiskConclusion())) {
            assessment.setOverallRiskConclusion(request.getOverallRiskConclusion().trim());
        }
        assessment.setUpdatedBy(actor);
        assessment.setUpdatedAt(OffsetDateTime.now());

        RiskAssessment saved = riskAssessmentRepository.save(assessment);

        auditEventService.record(
                "RISK_ASSESSMENT",
                saved.getId(),
                AuditEventType.E_SIGNATURE,
                "acceptanceESignatureId",
                null,
                signature.getId().toString(),
                request.getReason(),
                actor,
                "RISK_ASSESSMENT"
        );
        auditEventService.record(
                "RISK_ASSESSMENT",
                saved.getId(),
                AuditEventType.STATUS_CHANGE,
                "status",
                oldStatus.name(),
                RiskAssessmentStatus.ACCEPTED.name(),
                request.getReason(),
                actor,
                "RISK_ASSESSMENT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RiskAssessmentSummaryResponse getSummary() {
        long total = riskAssessmentRepository.countByIsActiveTrue();
        long highRpnCount = riskItemRepository.countAssessmentsWithHighRpn();
        long pendingAcceptance = riskAssessmentRepository.countByStatusAndIsActiveTrue(RiskAssessmentStatus.UNDER_REVIEW);
        long criticalItems = riskItemRepository.countAllActiveCritical();

        return RiskAssessmentSummaryResponse.builder()
                .total(total)
                .highRpnCount(highRpnCount)
                .pendingAcceptance(pendingAcceptance)
                .criticalItems(criticalItems)
                .build();
    }

    private RiskAssessment getActiveAssessment(UUID id) {
        return riskAssessmentRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Risk assessment not found: " + id));
    }

    private RiskAssessmentResponse toResponse(RiskAssessment ra) {
        List<RiskItem> items = riskItemRepository.findByRiskAssessmentIdAndIsActiveTrueOrderBySequenceNumber(ra.getId());
        int highRpnItemsCount = (int) items.stream().filter(i -> i.getRpn() >= 50).count();
        int criticalItemsCount = (int) items.stream().filter(i -> i.getSeverity() == 5).count();
        List<RiskItemResponse> itemResponses = items.stream().map(this::toItemResponse).toList();

        return RiskAssessmentResponse.builder()
                .id(ra.getId())
                .assessmentNumber(ra.getAssessmentNumber())
                .title(ra.getTitle())
                .scope(ra.getScope())
                .scopeEntityType(ra.getScopeEntityType())
                .scopeEntityId(ra.getScopeEntityId())
                .scopeEntityDisplay(ra.getScopeEntityDisplay())
                .status(ra.getStatus())
                .methodology(ra.getMethodology())
                .preparedBy(ra.getPreparedBy())
                .reviewedBy(ra.getReviewedBy())
                .acceptedBy(ra.getAcceptedBy())
                .acceptedAt(ra.getAcceptedAt())
                .acceptanceESignatureId(ra.getAcceptanceESignatureId())
                .nextReviewDate(ra.getNextReviewDate())
                .residualRiskAcceptable(ra.getResidualRiskAcceptable())
                .overallRiskConclusion(ra.getOverallRiskConclusion())
                .highRpnItemsCount(highRpnItemsCount)
                .criticalItemsCount(criticalItemsCount)
                .items(itemResponses)
                .isActive(ra.getIsActive())
                .createdBy(ra.getCreatedBy())
                .createdAt(ra.getCreatedAt())
                .updatedBy(ra.getUpdatedBy())
                .updatedAt(ra.getUpdatedAt())
                .build();
    }

    private RiskItemResponse toItemResponse(RiskItem item) {
        return RiskItemResponse.builder()
                .id(item.getId())
                .riskAssessmentId(item.getRiskAssessmentId())
                .sequenceNumber(item.getSequenceNumber())
                .processStep(item.getProcessStep())
                .failureMode(item.getFailureMode())
                .failureEffect(item.getFailureEffect())
                .failureCause(item.getFailureCause())
                .currentControls(item.getCurrentControls())
                .probability(item.getProbability())
                .severity(item.getSeverity())
                .detectability(item.getDetectability())
                .rpn(item.getRpn())
                .riskControlType(item.getRiskControlType())
                .proposedAction(item.getProposedAction())
                .actionOwner(item.getActionOwner())
                .actionDueDate(item.getActionDueDate())
                .linkedCapaId(item.getLinkedCapaId())
                .residualProbability(item.getResidualProbability())
                .residualSeverity(item.getResidualSeverity())
                .residualDetectability(item.getResidualDetectability())
                .residualRpn(item.getResidualRpn())
                .highRpn(item.getRpn() >= 50)
                .critical(item.getSeverity() == 5)
                .isActive(item.getIsActive())
                .createdBy(item.getCreatedBy())
                .createdAt(item.getCreatedAt())
                .updatedBy(item.getUpdatedBy())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private String nextAssessmentNumber() {
        String year = LocalDate.now().format(NUMBER_YEAR);
        for (int attempt = 0; attempt < 20; attempt++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
            String number = "RA-" + year + "-" + suffix;
            if (!riskAssessmentRepository.existsByAssessmentNumber(number)) {
                return number;
            }
        }
        throw new BusinessConflictException("Unable to generate a unique assessment number");
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
