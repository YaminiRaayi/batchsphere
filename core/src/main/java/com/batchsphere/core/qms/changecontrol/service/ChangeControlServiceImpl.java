package com.batchsphere.core.qms.changecontrol.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.qms.changecontrol.dto.*;
import com.batchsphere.core.qms.changecontrol.entity.*;
import com.batchsphere.core.qms.changecontrol.repository.ChangeControlAffectedEntityRepository;
import com.batchsphere.core.qms.changecontrol.repository.ChangeControlRepository;
import com.batchsphere.core.qms.changecontrol.repository.ChangeControlTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChangeControlServiceImpl implements ChangeControlService {

    private static final DateTimeFormatter NUMBER_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final ChangeControlRepository ccRepository;
    private final ChangeControlAffectedEntityRepository affectedEntityRepository;
    private final ChangeControlTaskRepository taskRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public ChangeControlResponse create(CreateChangeControlRequest request) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = ChangeControl.builder()
                .id(UUID.randomUUID())
                .changeControlNumber(nextNumber())
                .title(request.getTitle())
                .description(blankToNull(request.getDescription()))
                .changeType(request.getChangeType())
                .reason(request.getReason())
                .riskClassification(request.getRiskClassification())
                .status(ChangeControlStatus.DRAFT)
                .impactAssessment(blankToNull(request.getImpactAssessment()))
                .implementationPlan(blankToNull(request.getImplementationPlan()))
                .effectivenessCheck(blankToNull(request.getEffectivenessCheck()))
                .targetCompletionDate(request.getTargetCompletionDate())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.CREATE, "status",
                null, ChangeControlStatus.DRAFT.name(), null, actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    public Page<ChangeControlResponse> getAll(Pageable pageable) {
        return ccRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Override
    public ChangeControlResponse getById(UUID id) {
        return toResponse(getActive(id));
    }

    @Override
    @Transactional
    public ChangeControlResponse update(UUID id, UpdateChangeControlRequest request) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.DRAFT) {
            throw new BusinessConflictException("Change control can only be edited in DRAFT status");
        }
        cc.setTitle(request.getTitle());
        cc.setDescription(blankToNull(request.getDescription()));
        cc.setChangeType(request.getChangeType());
        cc.setReason(request.getReason());
        cc.setRiskClassification(request.getRiskClassification());
        cc.setImpactAssessment(blankToNull(request.getImpactAssessment()));
        cc.setImplementationPlan(blankToNull(request.getImplementationPlan()));
        cc.setEffectivenessCheck(blankToNull(request.getEffectivenessCheck()));
        cc.setTargetCompletionDate(request.getTargetCompletionDate());
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.UPDATE, "changeControlDetails",
                null, null, null, actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse submitForReview(UUID id) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.DRAFT) {
            throw new BusinessConflictException("Only DRAFT change controls can be submitted for review");
        }
        cc.setStatus(ChangeControlStatus.UNDER_REVIEW);
        cc.setSubmittedBy(actor);
        cc.setSubmittedAt(LocalDateTime.now());
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                ChangeControlStatus.DRAFT.name(), ChangeControlStatus.UNDER_REVIEW.name(), null, actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse approve(UUID id, ChangeControlApproveRequest request) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.UNDER_REVIEW) {
            throw new BusinessConflictException("Change control must be UNDER_REVIEW to approve");
        }
        ESignatureRequest signReq = new ESignatureRequest();
        signReq.setUsername(request.getUsername());
        signReq.setPassword(request.getPassword());
        signReq.setMeaning(StringUtils.hasText(request.getMeaning())
                ? request.getMeaning() : "I approve this change control");
        ESignatureRecordResponse sig = eSignatureService.sign(
                "QMS_CHANGE_CONTROL", cc.getId(), "APPROVE_CHANGE_CONTROL",
                "I approve this change control", actor, signReq, request.getComments());
        cc.setStatus(ChangeControlStatus.APPROVED);
        cc.setApprovedBy(actor);
        cc.setApprovedAt(LocalDateTime.now());
        cc.setApprovalComments(blankToNull(request.getComments()));
        cc.setApprovalESignatureId(sig.getId());
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.E_SIGNATURE, "approvalESignatureId",
                null, sig.getId().toString(), request.getComments(), actor, "QMS_CHANGE_CONTROL");
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                ChangeControlStatus.UNDER_REVIEW.name(), ChangeControlStatus.APPROVED.name(),
                request.getComments(), actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse reject(UUID id, ChangeControlRejectRequest request) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.UNDER_REVIEW) {
            throw new BusinessConflictException("Change control must be UNDER_REVIEW to reject");
        }
        cc.setStatus(ChangeControlStatus.REJECTED);
        cc.setRejectedBy(actor);
        cc.setRejectedAt(LocalDateTime.now());
        cc.setRejectionReason(request.getReason());
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                ChangeControlStatus.UNDER_REVIEW.name(), ChangeControlStatus.REJECTED.name(),
                request.getReason(), actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse startImplementation(UUID id) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.APPROVED) {
            throw new BusinessConflictException("Change control must be APPROVED to start implementation");
        }
        cc.setStatus(ChangeControlStatus.IN_IMPLEMENTATION);
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                ChangeControlStatus.APPROVED.name(), ChangeControlStatus.IN_IMPLEMENTATION.name(),
                null, actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse moveToEffectivenessCheck(UUID id) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.IN_IMPLEMENTATION) {
            throw new BusinessConflictException("Change control must be IN_IMPLEMENTATION to move to effectiveness check");
        }
        cc.setStatus(ChangeControlStatus.EFFECTIVENESS_CHECK);
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                ChangeControlStatus.IN_IMPLEMENTATION.name(), ChangeControlStatus.EFFECTIVENESS_CHECK.name(),
                null, actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse close(UUID id, ChangeControlCloseRequest request) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() != ChangeControlStatus.EFFECTIVENESS_CHECK) {
            throw new BusinessConflictException("Change control must be in EFFECTIVENESS_CHECK to close");
        }
        List<ChangeControlTask> tasks = taskRepository.findByChangeControlIdAndIsActiveTrueOrderByCreatedAtAsc(id);
        boolean hasPending = tasks.stream().anyMatch(t ->
                t.getStatus() == ChangeControlTaskStatus.PENDING || t.getStatus() == ChangeControlTaskStatus.IN_PROGRESS);
        if (hasPending) {
            throw new BusinessConflictException("All implementation tasks must be completed or skipped before closing");
        }
        ESignatureRequest signReq = new ESignatureRequest();
        signReq.setUsername(request.getUsername());
        signReq.setPassword(request.getPassword());
        signReq.setMeaning(StringUtils.hasText(request.getMeaning())
                ? request.getMeaning() : "I confirm the change control is complete and effective");
        ESignatureRecordResponse sig = eSignatureService.sign(
                "QMS_CHANGE_CONTROL", cc.getId(), "CLOSE_CHANGE_CONTROL",
                "I confirm the change control is complete and effective", actor, signReq, request.getClosureSummary());
        cc.setStatus(ChangeControlStatus.CLOSED);
        cc.setClosureSummary(request.getClosureSummary());
        cc.setClosedBy(actor);
        cc.setClosedAt(LocalDateTime.now());
        cc.setClosureESignatureId(sig.getId());
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.E_SIGNATURE, "closureESignatureId",
                null, sig.getId().toString(), request.getClosureSummary(), actor, "QMS_CHANGE_CONTROL");
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                ChangeControlStatus.EFFECTIVENESS_CHECK.name(), ChangeControlStatus.CLOSED.name(),
                request.getClosureSummary(), actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlResponse cancel(UUID id, String reason) {
        String actor = authenticatedActorService.currentActor();
        ChangeControl cc = getActive(id);
        if (cc.getStatus() == ChangeControlStatus.CLOSED || cc.getStatus() == ChangeControlStatus.CANCELLED) {
            throw new BusinessConflictException("Cannot cancel a " + cc.getStatus().name() + " change control");
        }
        String prev = cc.getStatus().name();
        cc.setStatus(ChangeControlStatus.CANCELLED);
        cc.setUpdatedBy(actor);
        cc.setUpdatedAt(LocalDateTime.now());
        ChangeControl saved = ccRepository.save(cc);
        auditEventService.record("QMS_CHANGE_CONTROL", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                prev, ChangeControlStatus.CANCELLED.name(), reason, actor, "QMS_CHANGE_CONTROL");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ChangeControlAffectedEntityResponse addAffectedEntity(UUID id, AddAffectedEntityRequest request) {
        getActive(id);
        ChangeControlAffectedEntity entity = ChangeControlAffectedEntity.builder()
                .id(UUID.randomUUID())
                .changeControlId(id)
                .entityType(request.getEntityType())
                .entityReference(request.getEntityReference())
                .entityId(request.getEntityId())
                .notes(blankToNull(request.getNotes()))
                .createdAt(LocalDateTime.now())
                .build();
        ChangeControlAffectedEntity saved = affectedEntityRepository.save(entity);
        return toEntityResponse(saved);
    }

    @Override
    @Transactional
    public void removeAffectedEntity(UUID id, UUID entityId) {
        getActive(id);
        ChangeControlAffectedEntity entity = affectedEntityRepository.findByIdAndChangeControlId(entityId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Affected entity not found"));
        affectedEntityRepository.delete(entity);
    }

    @Override
    @Transactional
    public ChangeControlTaskResponse addTask(UUID id, CreateTaskRequest request) {
        getActive(id);
        ChangeControlTask task = ChangeControlTask.builder()
                .id(UUID.randomUUID())
                .changeControlId(id)
                .title(request.getTitle())
                .description(blankToNull(request.getDescription()))
                .assignedTo(blankToNull(request.getAssignedTo()))
                .dueDate(request.getDueDate())
                .status(ChangeControlTaskStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .isActive(true)
                .build();
        return toTaskResponse(taskRepository.save(task));
    }

    @Override
    @Transactional
    public ChangeControlTaskResponse updateTaskStatus(UUID id, UUID taskId, UpdateTaskStatusRequest request) {
        String actor = authenticatedActorService.currentActor();
        getActive(id);
        ChangeControlTask task = taskRepository.findByIdAndChangeControlIdAndIsActiveTrue(taskId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setStatus(request.getStatus());
        if (request.getStatus() == ChangeControlTaskStatus.COMPLETED) {
            task.setCompletedAt(LocalDateTime.now());
            task.setCompletedBy(actor);
        }
        return toTaskResponse(taskRepository.save(task));
    }

    @Override
    @Transactional
    public void removeTask(UUID id, UUID taskId) {
        getActive(id);
        ChangeControlTask task = taskRepository.findByIdAndChangeControlIdAndIsActiveTrue(taskId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setIsActive(false);
        taskRepository.save(task);
    }

    private ChangeControl getActive(UUID id) {
        return ccRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Change control not found: " + id));
    }

    private ChangeControlResponse toResponse(ChangeControl cc) {
        List<ChangeControlAffectedEntityResponse> entities = affectedEntityRepository
                .findByChangeControlIdOrderByCreatedAtAsc(cc.getId())
                .stream().map(this::toEntityResponse).toList();
        List<ChangeControlTaskResponse> tasks = taskRepository
                .findByChangeControlIdAndIsActiveTrueOrderByCreatedAtAsc(cc.getId())
                .stream().map(this::toTaskResponse).toList();
        return ChangeControlResponse.builder()
                .id(cc.getId())
                .changeControlNumber(cc.getChangeControlNumber())
                .title(cc.getTitle())
                .description(cc.getDescription())
                .changeType(cc.getChangeType().name())
                .reason(cc.getReason())
                .riskClassification(cc.getRiskClassification().name())
                .status(cc.getStatus().name())
                .impactAssessment(cc.getImpactAssessment())
                .implementationPlan(cc.getImplementationPlan())
                .effectivenessCheck(cc.getEffectivenessCheck())
                .closureSummary(cc.getClosureSummary())
                .targetCompletionDate(cc.getTargetCompletionDate())
                .submittedBy(cc.getSubmittedBy())
                .submittedAt(cc.getSubmittedAt())
                .approvedBy(cc.getApprovedBy())
                .approvedAt(cc.getApprovedAt())
                .approvalComments(cc.getApprovalComments())
                .approvalESignatureId(cc.getApprovalESignatureId())
                .rejectedBy(cc.getRejectedBy())
                .rejectedAt(cc.getRejectedAt())
                .rejectionReason(cc.getRejectionReason())
                .closedBy(cc.getClosedBy())
                .closedAt(cc.getClosedAt())
                .closureESignatureId(cc.getClosureESignatureId())
                .createdBy(cc.getCreatedBy())
                .createdAt(cc.getCreatedAt())
                .updatedBy(cc.getUpdatedBy())
                .updatedAt(cc.getUpdatedAt())
                .affectedEntities(entities)
                .tasks(tasks)
                .build();
    }

    private ChangeControlAffectedEntityResponse toEntityResponse(ChangeControlAffectedEntity e) {
        return ChangeControlAffectedEntityResponse.builder()
                .id(e.getId())
                .entityType(e.getEntityType().name())
                .entityReference(e.getEntityReference())
                .entityId(e.getEntityId())
                .notes(e.getNotes())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private ChangeControlTaskResponse toTaskResponse(ChangeControlTask t) {
        return ChangeControlTaskResponse.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .assignedTo(t.getAssignedTo())
                .dueDate(t.getDueDate())
                .status(t.getStatus().name())
                .completedAt(t.getCompletedAt())
                .completedBy(t.getCompletedBy())
                .createdAt(t.getCreatedAt())
                .build();
    }

    private String nextNumber() {
        String datePart = LocalDate.now().format(NUMBER_DATE);
        for (int i = 0; i < 20; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
            String number = "CC-" + datePart + "-" + suffix;
            if (!ccRepository.existsByChangeControlNumber(number)) return number;
        }
        throw new BusinessConflictException("Unable to generate a unique change control number");
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s : null;
    }
}
