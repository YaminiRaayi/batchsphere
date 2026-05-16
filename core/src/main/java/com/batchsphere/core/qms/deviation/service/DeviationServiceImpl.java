package com.batchsphere.core.qms.deviation.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.qms.deviation.dto.CreateDeviationRequest;
import com.batchsphere.core.qms.deviation.entity.DeviationSourceModule;
import com.batchsphere.core.qms.deviation.entity.DeviationType;
import com.batchsphere.core.qms.deviation.dto.DeviationResponse;
import com.batchsphere.core.qms.deviation.dto.DeviationStatusUpdateRequest;
import com.batchsphere.core.qms.deviation.dto.DeviationSummaryResponse;
import com.batchsphere.core.qms.deviation.dto.UpdateDeviationRequest;
import com.batchsphere.core.qms.deviation.entity.Deviation;
import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
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
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviationServiceImpl implements DeviationService {

    private static final DateTimeFormatter NUMBER_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final DeviationRepository deviationRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public DeviationResponse createDeviation(CreateDeviationRequest request) {
        String actor = authenticatedActorService.currentActor();
        LocalDateTime now = LocalDateTime.now();
        Deviation deviation = Deviation.builder()
                .id(UUID.randomUUID())
                .deviationNumber(nextDeviationNumber())
                .title(trimRequired(request.getTitle(), "Deviation title is required"))
                .description(trimRequired(request.getDescription(), "Deviation description is required"))
                .deviationType(request.getDeviationType())
                .severity(request.getSeverity())
                .status(DeviationStatus.OPEN)
                .sourceModule(request.getSourceModule())
                .sourceEntityId(request.getSourceEntityId())
                .sourceReference(blankToNull(request.getSourceReference()))
                .department(blankToNull(request.getDepartment()))
                .detectedBy(actor)
                .detectedAt(request.getDetectedAt() == null ? now : request.getDetectedAt())
                .immediateAction(blankToNull(request.getImmediateAction()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        Deviation saved = deviationRepository.save(deviation);
        auditEventService.record(
                "QMS_DEVIATION",
                saved.getId(),
                AuditEventType.CREATE,
                "status",
                null,
                saved.getStatus().name(),
                saved.getTitle(),
                actor,
                "QMS_DEVIATION"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviationResponse> getAllDeviations(Pageable pageable) {
        return deviationRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviationResponse getDeviationById(UUID id) {
        return toResponse(getActiveDeviation(id));
    }

    @Override
    @Transactional
    public DeviationResponse updateDeviation(UUID id, UpdateDeviationRequest request) {
        String actor = authenticatedActorService.currentActor();
        Deviation deviation = getActiveDeviation(id);
        if (deviation.getStatus() == DeviationStatus.CLOSED || deviation.getStatus() == DeviationStatus.CANCELLED) {
            throw new BusinessConflictException("Closed or cancelled deviations cannot be edited");
        }

        deviation.setTitle(trimRequired(request.getTitle(), "Deviation title is required"));
        deviation.setDescription(trimRequired(request.getDescription(), "Deviation description is required"));
        deviation.setDeviationType(request.getDeviationType());
        deviation.setSeverity(request.getSeverity());
        deviation.setDepartment(blankToNull(request.getDepartment()));
        deviation.setImmediateAction(blankToNull(request.getImmediateAction()));
        deviation.setInvestigationSummary(blankToNull(request.getInvestigationSummary()));
        deviation.setRootCause(blankToNull(request.getRootCause()));
        deviation.setImpactAssessment(blankToNull(request.getImpactAssessment()));
        deviation.setUpdatedBy(actor);
        deviation.setUpdatedAt(LocalDateTime.now());

        Deviation saved = deviationRepository.save(deviation);
        auditEventService.record(
                "QMS_DEVIATION",
                saved.getId(),
                AuditEventType.UPDATE,
                "investigation",
                null,
                "UPDATED",
                "Deviation investigation details updated",
                actor,
                "QMS_DEVIATION"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    public DeviationResponse updateStatus(UUID id, DeviationStatusUpdateRequest request) {
        String actor = authenticatedActorService.currentActor();
        Deviation deviation = getActiveDeviation(id);
        DeviationStatus oldStatus = deviation.getStatus();
        DeviationStatus nextStatus = request.getStatus();
        if (oldStatus == nextStatus) {
            return toResponse(deviation);
        }
        validateTransition(deviation, nextStatus);

        UUID signatureId = null;
        if (nextStatus == DeviationStatus.CLOSED) {
            ESignatureRequest signatureRequest = new ESignatureRequest();
            signatureRequest.setUsername(request.getUsername());
            signatureRequest.setPassword(request.getPassword());
            signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning())
                    ? request.getMeaning()
                    : "I approve closure of this quality deviation");
            ESignatureRecordResponse signature = eSignatureService.sign(
                    "QMS_DEVIATION",
                    deviation.getId(),
                    "CLOSE_DEVIATION",
                    "I approve closure of this quality deviation",
                    actor,
                    signatureRequest,
                    request.getReason()
            );
            signatureId = signature.getId();
            deviation.setClosedBy(actor);
            deviation.setClosedAt(LocalDateTime.now());
            deviation.setClosureESignatureId(signatureId);
            deviation.setClosureSummary(trimRequired(request.getClosureSummary(), "Closure summary is required"));
        }

        deviation.setStatus(nextStatus);
        deviation.setUpdatedBy(actor);
        deviation.setUpdatedAt(LocalDateTime.now());

        Deviation saved = deviationRepository.save(deviation);
        auditEventService.record(
                "QMS_DEVIATION",
                saved.getId(),
                AuditEventType.STATUS_CHANGE,
                "status",
                oldStatus.name(),
                nextStatus.name(),
                request.getReason(),
                actor,
                "QMS_DEVIATION"
        );
        if (signatureId != null) {
            auditEventService.record(
                    "QMS_DEVIATION",
                    saved.getId(),
                    AuditEventType.E_SIGNATURE,
                    "closureESignatureId",
                    null,
                    signatureId.toString(),
                    request.getReason(),
                    actor,
                    "QMS_DEVIATION"
            );
        }
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviationSummaryResponse getSummary() {
        Map<DeviationStatus, Long> statusCounts = new EnumMap<>(DeviationStatus.class);
        for (DeviationStatus status : DeviationStatus.values()) {
            statusCounts.put(status, 0L);
        }
        for (Object[] row : deviationRepository.countActiveByStatus()) {
            statusCounts.put((DeviationStatus) row[0], (Long) row[1]);
        }

        Map<DeviationSeverity, Long> severityCounts = new EnumMap<>(DeviationSeverity.class);
        for (DeviationSeverity severity : DeviationSeverity.values()) {
            severityCounts.put(severity, 0L);
        }
        for (Object[] row : deviationRepository.countActiveBySeverity()) {
            severityCounts.put((DeviationSeverity) row[0], (Long) row[1]);
        }

        return DeviationSummaryResponse.builder()
                .countsByStatus(statusCounts)
                .countsBySeverity(severityCounts)
                .build();
    }

    private String nextDeviationNumber() {
        String datePart = LocalDate.now().format(NUMBER_DATE);
        for (int attempt = 0; attempt < 20; attempt++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
            String number = "DEV-" + datePart + "-" + suffix;
            if (!deviationRepository.existsByDeviationNumber(number)) {
                return number;
            }
        }
        throw new BusinessConflictException("Unable to generate a unique deviation number");
    }

    private Deviation getActiveDeviation(UUID id) {
        return deviationRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deviation not found: " + id));
    }

    private void validateTransition(Deviation deviation, DeviationStatus nextStatus) {
        if (deviation.getStatus() == DeviationStatus.CLOSED || deviation.getStatus() == DeviationStatus.CANCELLED) {
            throw new BusinessConflictException("Closed or cancelled deviations cannot change status");
        }
        if (nextStatus == DeviationStatus.CLOSED) {
            if (!StringUtils.hasText(deviation.getInvestigationSummary())) {
                throw new BusinessConflictException("Investigation summary is required before closing deviation");
            }
            if (!StringUtils.hasText(deviation.getRootCause())) {
                throw new BusinessConflictException("Root cause is required before closing deviation");
            }
            if (deviation.getRootCause() != null && deviation.getRootCause().trim().length() < 20) {
                throw new BusinessConflictException("Root cause must be at least 20 characters (ALCOA+ requirement)");
            }
            if (!StringUtils.hasText(deviation.getImpactAssessment())) {
                throw new BusinessConflictException("Impact assessment is required before closing deviation");
            }
        }
    }

    private DeviationResponse toResponse(Deviation deviation) {
        return DeviationResponse.builder()
                .id(deviation.getId())
                .deviationNumber(deviation.getDeviationNumber())
                .title(deviation.getTitle())
                .description(deviation.getDescription())
                .deviationType(deviation.getDeviationType())
                .severity(deviation.getSeverity())
                .status(deviation.getStatus())
                .sourceModule(deviation.getSourceModule())
                .sourceEntityId(deviation.getSourceEntityId())
                .sourceReference(deviation.getSourceReference())
                .department(deviation.getDepartment())
                .detectedBy(deviation.getDetectedBy())
                .detectedAt(deviation.getDetectedAt())
                .immediateAction(deviation.getImmediateAction())
                .investigationSummary(deviation.getInvestigationSummary())
                .rootCause(deviation.getRootCause())
                .impactAssessment(deviation.getImpactAssessment())
                .closureSummary(deviation.getClosureSummary())
                .closedBy(deviation.getClosedBy())
                .closedAt(deviation.getClosedAt())
                .closureESignatureId(deviation.getClosureESignatureId())
                .isActive(deviation.getIsActive())
                .createdBy(deviation.getCreatedBy())
                .createdAt(deviation.getCreatedAt())
                .updatedBy(deviation.getUpdatedBy())
                .updatedAt(deviation.getUpdatedAt())
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

    @Override
    @Transactional
    public DeviationResponse createAutoDeviation(UUID sourceEntityId, String sourceReference, String title, String actor) {
        LocalDateTime now = LocalDateTime.now();
        Deviation deviation = Deviation.builder()
                .id(UUID.randomUUID())
                .deviationNumber(nextDeviationNumber())
                .title(title)
                .description("Auto-created on rejection of " + sourceReference + ". Investigate root cause and take corrective action.")
                .deviationType(DeviationType.MATERIAL)
                .severity(DeviationSeverity.MAJOR)
                .status(DeviationStatus.OPEN)
                .sourceModule(DeviationSourceModule.GRN)
                .sourceEntityId(sourceEntityId)
                .sourceReference(sourceReference)
                .department("Quality Control")
                .detectedBy(actor)
                .detectedAt(now)
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();
        Deviation saved = deviationRepository.save(deviation);
        auditEventService.record(
                "QMS_DEVIATION",
                saved.getId(),
                AuditEventType.CREATE,
                "status",
                null,
                DeviationStatus.OPEN.name(),
                "Auto-created deviation for GRN rejection: " + sourceReference,
                actor,
                "QMS_DEVIATION"
        );
        return toResponse(saved);
    }
}
