package com.batchsphere.core.qms.capa.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
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
import com.batchsphere.core.qms.capa.entity.Capa;
import com.batchsphere.core.qms.capa.entity.CapaApprovalStatus;
import com.batchsphere.core.qms.capa.entity.CapaEffectivenessOutcome;
import com.batchsphere.core.qms.capa.entity.CapaReassignment;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import com.batchsphere.core.qms.capa.repository.CapaReassignmentRepository;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.deviation.entity.Deviation;
import com.batchsphere.core.qms.deviation.entity.DeviationStatus;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CapaServiceImpl implements CapaService {

    private static final DateTimeFormatter NUMBER_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final CapaRepository capaRepository;
    private final CapaReassignmentRepository reassignmentRepository;
    private final DeviationRepository deviationRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public CapaResponse createCapa(CreateCapaRequest request) {
        String actor = authenticatedActorService.currentActor();
        Deviation deviation = getActiveDeviation(request.getDeviationId());
        if (deviation.getStatus() == DeviationStatus.CLOSED || deviation.getStatus() == DeviationStatus.CANCELLED) {
            throw new BusinessConflictException("CAPA cannot be created for a closed or cancelled deviation");
        }

        LocalDateTime now = LocalDateTime.now();
        Capa capa = Capa.builder()
                .id(UUID.randomUUID())
                .capaNumber(nextCapaNumber())
                .deviationId(deviation.getId())
                .title(trimRequired(request.getTitle(), "CAPA title is required"))
                .description(blankToNull(request.getDescription()))
                .severity(request.getSeverity())
                .status(CapaStatus.OPEN)
                .approvalStatus(CapaApprovalStatus.NONE)
                .effectivenessOutcome(CapaEffectivenessOutcome.PENDING)
                .owner(trimRequired(request.getOwner(), "CAPA owner is required"))
                .dueDate(request.getDueDate())
                .correctiveAction(requireMinLength(trimRequired(request.getCorrectiveAction(), "Corrective action is required"), 30, "Corrective action"))
                .preventiveAction(blankToNull(request.getPreventiveAction()))
                .effectivenessCheck(blankToNull(request.getEffectivenessCheck()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        Capa saved = capaRepository.save(capa);
        if (deviation.getStatus() != DeviationStatus.CAPA_IN_PROGRESS) {
            DeviationStatus oldStatus = deviation.getStatus();
            deviation.setStatus(DeviationStatus.CAPA_IN_PROGRESS);
            deviation.setUpdatedBy(actor);
            deviation.setUpdatedAt(now);
            deviationRepository.save(deviation);
            auditEventService.record("QMS_DEVIATION", deviation.getId(), AuditEventType.STATUS_CHANGE, "status",
                    oldStatus.name(), DeviationStatus.CAPA_IN_PROGRESS.name(), "CAPA created: " + saved.getCapaNumber(), actor, "QMS_CAPA");
        }

        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.CREATE, "status", null,
                saved.getStatus().name(), saved.getTitle(), actor, "QMS_CAPA");
        return toResponse(saved, deviation);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CapaResponse> getAllCapas(UUID deviationId, Pageable pageable) {
        Page<Capa> page = deviationId == null
                ? capaRepository.findByIsActiveTrue(pageable)
                : capaRepository.findByDeviationIdAndIsActiveTrue(deviationId, pageable);
        return page.map(capa -> toResponse(capa, getActiveDeviation(capa.getDeviationId())));
    }

    @Override
    @Transactional(readOnly = true)
    public CapaResponse getCapaById(UUID id) {
        Capa capa = getActiveCapa(id);
        return toResponse(capa, getActiveDeviation(capa.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse updateCapa(UUID id, UpdateCapaRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        ensureEditable(capa);
        capa.setTitle(trimRequired(request.getTitle(), "CAPA title is required"));
        capa.setDescription(blankToNull(request.getDescription()));
        capa.setSeverity(request.getSeverity());
        capa.setOwner(trimRequired(request.getOwner(), "CAPA owner is required"));
        capa.setDueDate(request.getDueDate());
        capa.setCorrectiveAction(requireMinLength(trimRequired(request.getCorrectiveAction(), "Corrective action is required"), 30, "Corrective action"));
        capa.setPreventiveAction(blankToNull(request.getPreventiveAction()));
        capa.setEffectivenessCheck(blankToNull(request.getEffectivenessCheck()));
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());

        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.UPDATE, "capaDetails",
                null, "UPDATED", "CAPA details updated", actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse updateStatus(UUID id, CapaStatusUpdateRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        CapaStatus oldStatus = capa.getStatus();
        CapaStatus nextStatus = request.getStatus();
        if (oldStatus == nextStatus) {
            return toResponse(capa, getActiveDeviation(capa.getDeviationId()));
        }
        validateTransition(capa, nextStatus);

        UUID signatureId = null;
        if (nextStatus == CapaStatus.CLOSED) {
            ESignatureRequest signatureRequest = new ESignatureRequest();
            signatureRequest.setUsername(request.getUsername());
            signatureRequest.setPassword(request.getPassword());
            signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning())
                    ? request.getMeaning()
                    : "I approve CAPA closure and effectiveness verification");
            ESignatureRecordResponse signature = eSignatureService.sign(
                    "QMS_CAPA",
                    capa.getId(),
                    "CLOSE_CAPA",
                    "I approve CAPA closure and effectiveness verification",
                    actor,
                    signatureRequest,
                    request.getReason()
            );
            signatureId = signature.getId();
            capa.setClosedBy(actor);
            capa.setClosedAt(LocalDateTime.now());
            capa.setClosureESignatureId(signatureId);
            capa.setCompletionSummary(trimRequired(request.getCompletionSummary(), "Completion summary is required"));
        } else if (nextStatus == CapaStatus.COMPLETED || nextStatus == CapaStatus.EFFECTIVENESS_CHECK) {
            capa.setCompletionSummary(blankToNull(request.getCompletionSummary()));
        } else if (nextStatus == CapaStatus.IN_PROGRESS && oldStatus == CapaStatus.EFFECTIVENESS_CHECK) {
            // Reopen after failed effectiveness review — reset review outcome and approval
            capa.setEffectivenessOutcome(CapaEffectivenessOutcome.PENDING);
            capa.setEffectivenessReviewAt(null);
            capa.setEffectivenessReviewBy(null);
            capa.setEffectivenessOutcomeComments(null);
            capa.setEffectivenessESignatureId(null);
            capa.setApprovalStatus(CapaApprovalStatus.NONE);
            capa.setApprovedBy(null);
            capa.setApprovedAt(null);
            capa.setApprovalComments(null);
            capa.setApprovalESignatureId(null);
        }

        capa.setStatus(nextStatus);
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                oldStatus.name(), nextStatus.name(), request.getReason(), actor, "QMS_CAPA");
        if (signatureId != null) {
            auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.E_SIGNATURE, "closureESignatureId",
                    null, signatureId.toString(), request.getReason(), actor, "QMS_CAPA");
        }
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse submitForApproval(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        if (capa.getStatus() != CapaStatus.IN_PROGRESS) {
            throw new BusinessConflictException("Only IN_PROGRESS CAPAs can be submitted for approval");
        }
        if (capa.getApprovalStatus() == CapaApprovalStatus.PENDING_APPROVAL) {
            throw new BusinessConflictException("CAPA is already pending approval");
        }
        capa.setApprovalStatus(CapaApprovalStatus.PENDING_APPROVAL);
        capa.setSubmittedForApprovalBy(actor);
        capa.setSubmittedForApprovalAt(LocalDateTime.now());
        capa.setApprovedBy(null);
        capa.setApprovedAt(null);
        capa.setApprovalComments(null);
        capa.setApprovalESignatureId(null);
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.WORKFLOW_ACTION, "approvalStatus",
                CapaApprovalStatus.NONE.name(), CapaApprovalStatus.PENDING_APPROVAL.name(),
                "Submitted for approval", actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse approveCapa(UUID id, CapaApproveRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        if (capa.getApprovalStatus() != CapaApprovalStatus.PENDING_APPROVAL) {
            throw new BusinessConflictException("CAPA is not pending approval");
        }
        ESignatureRequest signatureRequest = new ESignatureRequest();
        signatureRequest.setUsername(request.getUsername());
        signatureRequest.setPassword(request.getPassword());
        signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning())
                ? request.getMeaning()
                : "I approve this CAPA action plan");
        ESignatureRecordResponse signature = eSignatureService.sign(
                "QMS_CAPA", capa.getId(), "APPROVE_CAPA",
                "I approve this CAPA action plan", actor, signatureRequest, request.getComments());
        capa.setApprovalStatus(CapaApprovalStatus.APPROVED);
        capa.setApprovedBy(actor);
        capa.setApprovedAt(LocalDateTime.now());
        capa.setApprovalComments(blankToNull(request.getComments()));
        capa.setApprovalESignatureId(signature.getId());
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.E_SIGNATURE, "approvalESignatureId",
                null, signature.getId().toString(), request.getComments(), actor, "QMS_CAPA");
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.STATUS_CHANGE, "approvalStatus",
                CapaApprovalStatus.PENDING_APPROVAL.name(), CapaApprovalStatus.APPROVED.name(),
                request.getComments(), actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse rejectCapa(UUID id, CapaRejectRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        if (capa.getApprovalStatus() != CapaApprovalStatus.PENDING_APPROVAL) {
            throw new BusinessConflictException("CAPA is not pending approval");
        }
        capa.setApprovalStatus(CapaApprovalStatus.REJECTED);
        capa.setApprovalComments(blankToNull(request.getReason()));
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.STATUS_CHANGE, "approvalStatus",
                CapaApprovalStatus.PENDING_APPROVAL.name(), CapaApprovalStatus.REJECTED.name(),
                request.getReason(), actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse scheduleEffectivenessReview(UUID id, ScheduleEffectivenessReviewRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        if (capa.getStatus() != CapaStatus.EFFECTIVENESS_CHECK) {
            throw new BusinessConflictException("Effectiveness review can only be scheduled when CAPA is in EFFECTIVENESS_CHECK status");
        }
        capa.setEffectivenessReviewDate(request.getEffectivenessReviewDate());
        capa.setEffectivenessReviewer(request.getEffectivenessReviewer().trim());
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.UPDATE, "effectivenessReviewDate",
                null, saved.getEffectivenessReviewDate().toString(),
                "Effectiveness review scheduled for " + saved.getEffectivenessReviewer(), actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse reviewEffectiveness(UUID id, CapaEffectivenessReviewRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        if (capa.getStatus() != CapaStatus.EFFECTIVENESS_CHECK) {
            throw new BusinessConflictException("Effectiveness review requires CAPA to be in EFFECTIVENESS_CHECK status");
        }
        if (request.getOutcome() == CapaEffectivenessOutcome.PENDING) {
            throw new BusinessConflictException("Outcome must be PASSED or FAILED");
        }
        ESignatureRequest signatureRequest = new ESignatureRequest();
        signatureRequest.setUsername(request.getUsername());
        signatureRequest.setPassword(request.getPassword());
        signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning())
                ? request.getMeaning()
                : (request.getOutcome() == CapaEffectivenessOutcome.PASSED
                        ? "I confirm CAPA effectiveness verified — action plan effective"
                        : "I confirm CAPA effectiveness failed — reopening required"));
        ESignatureRecordResponse signature = eSignatureService.sign(
                "QMS_CAPA", capa.getId(), "EFFECTIVENESS_REVIEW",
                signatureRequest.getMeaning(), actor, signatureRequest, request.getComments());
        capa.setEffectivenessOutcome(request.getOutcome());
        capa.setEffectivenessOutcomeComments(blankToNull(request.getComments()));
        capa.setEffectivenessReviewAt(LocalDateTime.now());
        capa.setEffectivenessReviewBy(actor);
        capa.setEffectivenessESignatureId(signature.getId());
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.E_SIGNATURE, "effectivenessESignatureId",
                null, signature.getId().toString(), request.getComments(), actor, "QMS_CAPA");
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.STATUS_CHANGE, "effectivenessOutcome",
                CapaEffectivenessOutcome.PENDING.name(), request.getOutcome().name(), request.getComments(), actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional
    public CapaResponse reassignCapa(UUID id, ReassignCapaRequest request) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(id);
        if (capa.getStatus() == CapaStatus.CLOSED || capa.getStatus() == CapaStatus.CANCELLED) {
            throw new BusinessConflictException("Cannot reassign a closed or cancelled CAPA");
        }
        String previousOwner = capa.getOwner();
        CapaReassignment record = CapaReassignment.builder()
                .id(UUID.randomUUID())
                .capaId(capa.getId())
                .previousOwner(previousOwner)
                .newOwner(request.getNewOwner())
                .reason(request.getReason())
                .assignedBy(actor)
                .assignedAt(LocalDateTime.now())
                .build();
        reassignmentRepository.save(record);
        capa.setOwner(request.getNewOwner());
        capa.setUpdatedBy(actor);
        capa.setUpdatedAt(LocalDateTime.now());
        Capa saved = capaRepository.save(capa);
        auditEventService.record("QMS_CAPA", saved.getId(), AuditEventType.UPDATE, "owner",
                previousOwner, request.getNewOwner(), request.getReason(), actor, "QMS_CAPA");
        return toResponse(saved, getActiveDeviation(saved.getDeviationId()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CapaReassignmentResponse> getReassignmentHistory(UUID id) {
        getActiveCapa(id);
        return reassignmentRepository.findByCapaIdOrderByAssignedAtDesc(id)
                .stream()
                .map(r -> CapaReassignmentResponse.builder()
                        .id(r.getId())
                        .previousOwner(r.getPreviousOwner())
                        .newOwner(r.getNewOwner())
                        .reason(r.getReason())
                        .assignedBy(r.getAssignedBy())
                        .assignedAt(r.getAssignedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CapaSummaryResponse getSummary() {
        Map<CapaStatus, Long> statusCounts = new EnumMap<>(CapaStatus.class);
        for (CapaStatus status : CapaStatus.values()) {
            statusCounts.put(status, 0L);
        }
        for (Object[] row : capaRepository.countActiveByStatus()) {
            statusCounts.put((CapaStatus) row[0], (Long) row[1]);
        }
        LocalDate today = LocalDate.now();
        long overdueEffectiveness = capaRepository.countByIsActiveTrueAndStatusAndEffectivenessReviewDateBefore(CapaStatus.EFFECTIVENESS_CHECK, today);
        return CapaSummaryResponse.builder()
                .countsByStatus(statusCounts)
                .overdue(capaRepository.countByIsActiveTrueAndStatusNotAndDueDateBefore(CapaStatus.CLOSED, today))
                .dueThisWeek(capaRepository.countByIsActiveTrueAndStatusNotAndDueDateBetween(CapaStatus.CLOSED, today, today.plusDays(7)))
                .overdueEffectiveness(overdueEffectiveness)
                .alertCount((long) getAlerts().size())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CapaAlertResponse> getAlerts() {
        LocalDate today = LocalDate.now();
        List<CapaAlertResponse> overdue = capaRepository
                .findByIsActiveTrueAndStatusNotAndDueDateBefore(CapaStatus.CLOSED, today)
                .stream()
                .map(capa -> toAlert(capa, "OVERDUE", "HIGH", "CAPA is overdue"))
                .toList();
        List<CapaAlertResponse> dueSoon = capaRepository
                .findByIsActiveTrueAndStatusNotAndDueDateBetween(CapaStatus.CLOSED, today, today.plusDays(7))
                .stream()
                .filter(capa -> !capa.getDueDate().isBefore(today))
                .map(capa -> toAlert(capa, "DUE_SOON", "MEDIUM", "CAPA due within 7 days"))
                .toList();
        List<CapaAlertResponse> effectiveness = capaRepository
                .findByIsActiveTrueAndStatusAndEffectivenessReviewDateBefore(CapaStatus.EFFECTIVENESS_CHECK, today)
                .stream()
                .map(capa -> toAlert(capa, "EFFECTIVENESS_OVERDUE", "HIGH", "CAPA effectiveness review overdue"))
                .toList();
        return java.util.stream.Stream.of(overdue, dueSoon, effectiveness).flatMap(List::stream).toList();
    }

    private String nextCapaNumber() {
        String datePart = LocalDate.now().format(NUMBER_DATE);
        for (int attempt = 0; attempt < 20; attempt++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
            String number = "CAPA-" + datePart + "-" + suffix;
            if (!capaRepository.existsByCapaNumber(number)) {
                return number;
            }
        }
        throw new BusinessConflictException("Unable to generate a unique CAPA number");
    }

    private Deviation getActiveDeviation(UUID id) {
        return deviationRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deviation not found: " + id));
    }

    private Capa getActiveCapa(UUID id) {
        return capaRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("CAPA not found: " + id));
    }

    private void ensureEditable(Capa capa) {
        if (capa.getStatus() == CapaStatus.CLOSED || capa.getStatus() == CapaStatus.CANCELLED) {
            throw new BusinessConflictException("Closed or cancelled CAPAs cannot be edited");
        }
    }

    private void validateTransition(Capa capa, CapaStatus nextStatus) {
        if (capa.getStatus() == CapaStatus.CLOSED || capa.getStatus() == CapaStatus.CANCELLED) {
            throw new BusinessConflictException("Closed or cancelled CAPAs cannot change status");
        }
        List<CapaStatus> order = List.of(CapaStatus.OPEN, CapaStatus.IN_PROGRESS, CapaStatus.COMPLETED, CapaStatus.EFFECTIVENESS_CHECK, CapaStatus.CLOSED);
        if (nextStatus == CapaStatus.CANCELLED) {
            return;
        }
        // Allow reopen: EFFECTIVENESS_CHECK → IN_PROGRESS only when effectiveness failed
        if (nextStatus == CapaStatus.IN_PROGRESS && capa.getStatus() == CapaStatus.EFFECTIVENESS_CHECK) {
            if (capa.getEffectivenessOutcome() != CapaEffectivenessOutcome.FAILED) {
                throw new BusinessConflictException("CAPA can only be reopened from effectiveness check when outcome is FAILED");
            }
            return;
        }
        int currentIndex = order.indexOf(capa.getStatus());
        int nextIndex = order.indexOf(nextStatus);
        if (nextIndex < currentIndex) {
            throw new BusinessConflictException("CAPA status cannot move backwards");
        }
        if (nextStatus == CapaStatus.COMPLETED && capa.getApprovalStatus() != CapaApprovalStatus.APPROVED) {
            throw new BusinessConflictException("CAPA action plan must be approved before marking as completed");
        }
        if (nextStatus == CapaStatus.EFFECTIVENESS_CHECK && !StringUtils.hasText(capa.getEffectivenessCheck())) {
            throw new BusinessConflictException("Effectiveness check plan is required before effectiveness check");
        }
        if (nextStatus == CapaStatus.CLOSED) {
            if (capa.getStatus() != CapaStatus.EFFECTIVENESS_CHECK) {
                throw new BusinessConflictException("CAPA must pass through effectiveness check before closure");
            }
            if (!StringUtils.hasText(capa.getEffectivenessCheck())) {
                throw new BusinessConflictException("Effectiveness check is required before closure");
            }
            if (capa.getEffectivenessOutcome() != CapaEffectivenessOutcome.PASSED) {
                throw new BusinessConflictException("Effectiveness review must pass before CAPA can be closed");
            }
        }
    }

    private CapaResponse toResponse(Capa capa, Deviation deviation) {
        return CapaResponse.builder()
                .id(capa.getId())
                .capaNumber(capa.getCapaNumber())
                .deviationId(capa.getDeviationId())
                .deviationNumber(deviation.getDeviationNumber())
                .title(capa.getTitle())
                .description(capa.getDescription())
                .severity(capa.getSeverity())
                .status(capa.getStatus())
                .approvalStatus(capa.getApprovalStatus())
                .submittedForApprovalBy(capa.getSubmittedForApprovalBy())
                .submittedForApprovalAt(capa.getSubmittedForApprovalAt())
                .approvedBy(capa.getApprovedBy())
                .approvedAt(capa.getApprovedAt())
                .approvalComments(capa.getApprovalComments())
                .approvalESignatureId(capa.getApprovalESignatureId())
                .owner(capa.getOwner())
                .dueDate(capa.getDueDate())
                .correctiveAction(capa.getCorrectiveAction())
                .preventiveAction(capa.getPreventiveAction())
                .effectivenessCheck(capa.getEffectivenessCheck())
                .effectivenessReviewDate(capa.getEffectivenessReviewDate())
                .effectivenessReviewer(capa.getEffectivenessReviewer())
                .effectivenessOutcome(capa.getEffectivenessOutcome())
                .effectivenessOutcomeComments(capa.getEffectivenessOutcomeComments())
                .effectivenessReviewAt(capa.getEffectivenessReviewAt())
                .effectivenessReviewBy(capa.getEffectivenessReviewBy())
                .effectivenessESignatureId(capa.getEffectivenessESignatureId())
                .completionSummary(capa.getCompletionSummary())
                .closedBy(capa.getClosedBy())
                .closedAt(capa.getClosedAt())
                .closureESignatureId(capa.getClosureESignatureId())
                .isActive(capa.getIsActive())
                .createdBy(capa.getCreatedBy())
                .createdAt(capa.getCreatedAt())
                .updatedBy(capa.getUpdatedBy())
                .updatedAt(capa.getUpdatedAt())
                .build();
    }

    private CapaAlertResponse toAlert(Capa capa, String type, String severity, String message) {
        long daysUntilDue = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), capa.getDueDate());
        return CapaAlertResponse.builder()
                .capaId(capa.getId())
                .capaNumber(capa.getCapaNumber())
                .title(capa.getTitle())
                .owner(capa.getOwner())
                .alertType(type)
                .severity(severity)
                .dueDate(capa.getDueDate())
                .daysUntilDue(daysUntilDue)
                .message(message)
                .build();
    }

    private String trimRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessConflictException(message);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String requireMinLength(String value, int min, String fieldName) {
        if (value != null && value.length() < min) {
            throw new BusinessConflictException(fieldName + " must be at least " + min + " characters (ALCOA+ requirement)");
        }
        return value;
    }
}
