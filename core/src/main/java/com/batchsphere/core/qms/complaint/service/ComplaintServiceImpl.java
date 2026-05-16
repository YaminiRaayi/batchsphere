package com.batchsphere.core.qms.complaint.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.qms.complaint.dto.ComplaintResponse;
import com.batchsphere.core.qms.complaint.dto.ComplaintStatusUpdateRequest;
import com.batchsphere.core.qms.complaint.dto.ComplaintSummaryResponse;
import com.batchsphere.core.qms.complaint.dto.CreateComplaintRequest;
import com.batchsphere.core.qms.complaint.dto.UpdateComplaintRequest;
import com.batchsphere.core.qms.complaint.entity.Complaint;
import com.batchsphere.core.qms.complaint.entity.ComplaintCategory;
import com.batchsphere.core.qms.complaint.entity.ComplaintSeverity;
import com.batchsphere.core.qms.complaint.entity.ComplaintStatus;
import com.batchsphere.core.qms.complaint.entity.RegulatoryReportability;
import com.batchsphere.core.qms.complaint.repository.ComplaintRepository;
import com.batchsphere.core.qms.deviation.repository.DeviationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private static final DateTimeFormatter NUMBER_YEAR = DateTimeFormatter.ofPattern("yyyy");

    private final ComplaintRepository complaintRepository;
    private final DeviationRepository deviationRepository;
    private final CapaRepository capaRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public ComplaintResponse createComplaint(CreateComplaintRequest request) {
        String actor = authenticatedActorService.currentActor();
        OffsetDateTime now = OffsetDateTime.now();

        Complaint complaint = Complaint.builder()
                .id(UUID.randomUUID())
                .complaintNumber(nextComplaintNumber())
                .receivedDate(request.getReceivedDate())
                .source(request.getSource())
                .category(request.getCategory())
                .severity(request.getSeverity())
                .status(ComplaintStatus.RECEIVED)
                .productName(blankToNull(request.getProductName()))
                .lotNumber(blankToNull(request.getLotNumber()))
                .reportedBy(blankToNull(request.getReportedBy()))
                .description(trimRequired(request.getDescription(), "Complaint description is required"))
                .initialAssessment(blankToNull(request.getInitialAssessment()))
                .recallRequired(false)
                .regulatoryReportability(RegulatoryReportability.NOT_ASSESSED)
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        Complaint saved = complaintRepository.save(complaint);
        auditEventService.record(
                "COMPLAINT",
                saved.getId(),
                AuditEventType.CREATE,
                "status",
                null,
                saved.getStatus().name(),
                saved.getComplaintNumber(),
                actor,
                "COMPLAINT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ComplaintResponse> getAllComplaints(Pageable pageable) {
        return complaintRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintById(UUID id) {
        return toResponse(getActiveComplaint(id));
    }

    @Override
    @Transactional
    public ComplaintResponse updateComplaint(UUID id, UpdateComplaintRequest request) {
        String actor = authenticatedActorService.currentActor();
        Complaint complaint = getActiveComplaint(id);
        if (complaint.getStatus() == ComplaintStatus.CLOSED || complaint.getStatus() == ComplaintStatus.WITHDRAWN) {
            throw new BusinessConflictException("Closed or withdrawn complaints cannot be edited");
        }

        complaint.setCategory(request.getCategory());
        complaint.setSeverity(request.getSeverity());
        complaint.setProductName(blankToNull(request.getProductName()));
        complaint.setLotNumber(blankToNull(request.getLotNumber()));
        complaint.setReportedBy(blankToNull(request.getReportedBy()));
        if (StringUtils.hasText(request.getDescription())) {
            complaint.setDescription(request.getDescription().trim());
        }
        complaint.setInitialAssessment(blankToNull(request.getInitialAssessment()));
        complaint.setRootCause(blankToNull(request.getRootCause()));
        complaint.setImpactAssessment(blankToNull(request.getImpactAssessment()));
        complaint.setRecallRequired(request.isRecallRequired());
        if (request.getRegulatoryReportability() != null) {
            complaint.setRegulatoryReportability(request.getRegulatoryReportability());
        }
        complaint.setRegulatoryAuthority(blankToNull(request.getRegulatoryAuthority()));
        complaint.setRegulatoryReportDate(request.getRegulatoryReportDate());
        complaint.setUpdatedBy(actor);
        complaint.setUpdatedAt(OffsetDateTime.now());

        Complaint saved = complaintRepository.save(complaint);
        auditEventService.record(
                "COMPLAINT",
                saved.getId(),
                AuditEventType.UPDATE,
                "investigation",
                null,
                "UPDATED",
                "Complaint investigation details updated",
                actor,
                "COMPLAINT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ComplaintResponse updateStatus(UUID id, ComplaintStatusUpdateRequest request) {
        String actor = authenticatedActorService.currentActor();
        Complaint complaint = getActiveComplaint(id);
        ComplaintStatus oldStatus = complaint.getStatus();
        ComplaintStatus nextStatus = request.getStatus();

        if (oldStatus == nextStatus) {
            return toResponse(complaint);
        }
        validateTransition(complaint, nextStatus, request);

        if (nextStatus == ComplaintStatus.CLOSED) {
            ESignatureRequest signatureRequest = new ESignatureRequest();
            signatureRequest.setUsername(request.getUsername());
            signatureRequest.setPassword(request.getPassword());
            signatureRequest.setMeaning(StringUtils.hasText(request.getMeaning())
                    ? request.getMeaning()
                    : "I approve closure of this complaint");
            ESignatureRecordResponse signature = eSignatureService.sign(
                    "COMPLAINT",
                    complaint.getId(),
                    "CLOSE_COMPLAINT",
                    "I approve closure of this complaint",
                    actor,
                    signatureRequest,
                    request.getReason()
            );
            complaint.setClosedBy(actor);
            complaint.setClosedAt(OffsetDateTime.now());
            complaint.setClosureSummary(trimRequired(request.getClosureSummary(), "Closure summary is required"));

            auditEventService.record(
                    "COMPLAINT",
                    complaint.getId(),
                    AuditEventType.E_SIGNATURE,
                    "closureESignature",
                    null,
                    signature.getId().toString(),
                    request.getReason(),
                    actor,
                    "COMPLAINT"
            );
        }

        complaint.setStatus(nextStatus);
        complaint.setUpdatedBy(actor);
        complaint.setUpdatedAt(OffsetDateTime.now());

        Complaint saved = complaintRepository.save(complaint);
        auditEventService.record(
                "COMPLAINT",
                saved.getId(),
                AuditEventType.STATUS_CHANGE,
                "status",
                oldStatus.name(),
                nextStatus.name(),
                request.getReason(),
                actor,
                "COMPLAINT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ComplaintResponse linkDeviation(UUID complaintId, UUID deviationId) {
        String actor = authenticatedActorService.currentActor();
        Complaint complaint = getActiveComplaint(complaintId);
        if (!deviationRepository.existsById(deviationId)) {
            throw new ResourceNotFoundException("Deviation not found: " + deviationId);
        }
        complaint.setLinkedDeviationId(deviationId);
        complaint.setUpdatedBy(actor);
        complaint.setUpdatedAt(OffsetDateTime.now());

        Complaint saved = complaintRepository.save(complaint);
        auditEventService.record(
                "COMPLAINT",
                saved.getId(),
                AuditEventType.UPDATE,
                "linkedDeviationId",
                null,
                deviationId.toString(),
                "Deviation linked to complaint",
                actor,
                "COMPLAINT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ComplaintResponse linkCapa(UUID complaintId, UUID capaId) {
        String actor = authenticatedActorService.currentActor();
        Complaint complaint = getActiveComplaint(complaintId);
        if (!capaRepository.existsById(capaId)) {
            throw new ResourceNotFoundException("CAPA not found: " + capaId);
        }
        complaint.setLinkedCapaId(capaId);
        complaint.setUpdatedBy(actor);
        complaint.setUpdatedAt(OffsetDateTime.now());

        Complaint saved = complaintRepository.save(complaint);
        auditEventService.record(
                "COMPLAINT",
                saved.getId(),
                AuditEventType.UPDATE,
                "linkedCapaId",
                null,
                capaId.toString(),
                "CAPA linked to complaint",
                actor,
                "COMPLAINT"
        );
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintSummaryResponse getSummary() {
        Map<ComplaintStatus, Long> statusCounts = new EnumMap<>(ComplaintStatus.class);
        for (ComplaintStatus status : ComplaintStatus.values()) {
            statusCounts.put(status, 0L);
        }
        for (Object[] row : complaintRepository.countActiveByStatus()) {
            statusCounts.put((ComplaintStatus) row[0], (Long) row[1]);
        }

        Map<ComplaintCategory, Long> categoryCounts = new EnumMap<>(ComplaintCategory.class);
        for (ComplaintCategory category : ComplaintCategory.values()) {
            categoryCounts.put(category, 0L);
        }
        for (Object[] row : complaintRepository.countActiveByCategory()) {
            categoryCounts.put((ComplaintCategory) row[0], (Long) row[1]);
        }

        Map<ComplaintSeverity, Long> severityCounts = new EnumMap<>(ComplaintSeverity.class);
        for (ComplaintSeverity severity : ComplaintSeverity.values()) {
            severityCounts.put(severity, 0L);
        }
        for (Object[] row : complaintRepository.countActiveBySeverity()) {
            severityCounts.put((ComplaintSeverity) row[0], (Long) row[1]);
        }

        return ComplaintSummaryResponse.builder()
                .countsByStatus(statusCounts)
                .countsByCategory(categoryCounts)
                .countsBySeverity(severityCounts)
                .build();
    }

    private String nextComplaintNumber() {
        String year = LocalDate.now().format(NUMBER_YEAR);
        for (int attempt = 0; attempt < 20; attempt++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
            String number = "COMP-" + year + "-" + suffix;
            if (!complaintRepository.existsByComplaintNumber(number)) {
                return number;
            }
        }
        throw new BusinessConflictException("Unable to generate a unique complaint number");
    }

    private Complaint getActiveComplaint(UUID id) {
        return complaintRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found: " + id));
    }

    private void validateTransition(Complaint complaint, ComplaintStatus nextStatus, ComplaintStatusUpdateRequest request) {
        if (complaint.getStatus() == ComplaintStatus.CLOSED || complaint.getStatus() == ComplaintStatus.WITHDRAWN) {
            throw new BusinessConflictException("Closed or withdrawn complaints cannot change status");
        }
        if (nextStatus == ComplaintStatus.CLOSED) {
            if (complaint.getStatus() != ComplaintStatus.PENDING_CLOSURE) {
                throw new BusinessConflictException("Complaint must be in PENDING_CLOSURE status before closing");
            }
            if (!StringUtils.hasText(complaint.getRootCause())) {
                throw new BusinessConflictException("Root cause is required before closing complaint");
            }
            if (!StringUtils.hasText(complaint.getImpactAssessment())) {
                throw new BusinessConflictException("Impact assessment is required before closing complaint");
            }
        }
    }

    private ComplaintResponse toResponse(Complaint complaint) {
        return ComplaintResponse.builder()
                .id(complaint.getId())
                .complaintNumber(complaint.getComplaintNumber())
                .receivedDate(complaint.getReceivedDate())
                .source(complaint.getSource())
                .category(complaint.getCategory())
                .severity(complaint.getSeverity())
                .status(complaint.getStatus())
                .productName(complaint.getProductName())
                .lotNumber(complaint.getLotNumber())
                .reportedBy(complaint.getReportedBy())
                .description(complaint.getDescription())
                .initialAssessment(complaint.getInitialAssessment())
                .rootCause(complaint.getRootCause())
                .impactAssessment(complaint.getImpactAssessment())
                .recallRequired(complaint.getRecallRequired())
                .regulatoryReportability(complaint.getRegulatoryReportability())
                .regulatoryReportDate(complaint.getRegulatoryReportDate())
                .regulatoryAuthority(complaint.getRegulatoryAuthority())
                .linkedDeviationId(complaint.getLinkedDeviationId())
                .linkedCapaId(complaint.getLinkedCapaId())
                .closedBy(complaint.getClosedBy())
                .closedAt(complaint.getClosedAt())
                .closureSummary(complaint.getClosureSummary())
                .isActive(complaint.getIsActive())
                .createdBy(complaint.getCreatedBy())
                .createdAt(complaint.getCreatedAt())
                .updatedBy(complaint.getUpdatedBy())
                .updatedAt(complaint.getUpdatedAt())
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
}
