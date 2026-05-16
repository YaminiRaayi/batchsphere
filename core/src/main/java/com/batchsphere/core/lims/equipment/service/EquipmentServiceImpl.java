package com.batchsphere.core.lims.equipment.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.dto.ESignatureRecordResponse;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.equipment.dto.CreateEquipmentRequest;
import com.batchsphere.core.lims.equipment.dto.CreateQualificationRecordRequest;
import com.batchsphere.core.lims.equipment.dto.EquipmentResponse;
import com.batchsphere.core.lims.equipment.dto.EquipmentSummaryResponse;
import com.batchsphere.core.lims.equipment.dto.QualificationRecordResponse;
import com.batchsphere.core.lims.equipment.dto.UpdateEquipmentRequest;
import com.batchsphere.core.lims.equipment.entity.Equipment;
import com.batchsphere.core.lims.equipment.entity.EquipmentQualificationRecord;
import com.batchsphere.core.lims.equipment.entity.EquipmentStatus;
import com.batchsphere.core.lims.equipment.entity.EquipmentType;
import com.batchsphere.core.lims.equipment.entity.QualificationResult;
import com.batchsphere.core.lims.equipment.entity.QualificationType;
import com.batchsphere.core.lims.equipment.repository.EquipmentRepository;
import com.batchsphere.core.lims.equipment.repository.QualificationRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EquipmentServiceImpl implements EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final QualificationRecordRepository qualificationRecordRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;

    @Override
    @Transactional
    public EquipmentResponse createEquipment(CreateEquipmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        OffsetDateTime now = OffsetDateTime.now();

        String equipmentId = generateEquipmentId(request.getEquipmentType());

        Equipment equipment = Equipment.builder()
                .id(UUID.randomUUID())
                .equipmentId(equipmentId)
                .name(request.getName().trim())
                .equipmentType(request.getEquipmentType())
                .manufacturer(blankToNull(request.getManufacturer()))
                .model(blankToNull(request.getModel()))
                .serialNumber(blankToNull(request.getSerialNumber()))
                .location(request.getLocation().trim())
                .status(EquipmentStatus.PENDING_QUALIFICATION)
                .installationDate(request.getInstallationDate())
                .calibrationIntervalMonths(request.getCalibrationIntervalMonths() != null
                        ? request.getCalibrationIntervalMonths() : 12)
                .responsibleAnalyst(blankToNull(request.getResponsibleAnalyst()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        Equipment saved = equipmentRepository.save(equipment);
        auditEventService.record(
                "EQUIPMENT",
                saved.getId(),
                AuditEventType.CREATE,
                "status",
                null,
                saved.getStatus().name(),
                saved.getEquipmentId(),
                actor,
                "EQUIPMENT"
        );
        return EquipmentResponse.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EquipmentResponse> getAllEquipment(Pageable pageable) {
        return equipmentRepository.findByIsActiveTrue(pageable).map(EquipmentResponse::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public EquipmentResponse getEquipmentById(UUID id) {
        return EquipmentResponse.toResponse(getActiveEquipment(id));
    }

    @Override
    @Transactional
    public EquipmentResponse updateEquipment(UUID id, UpdateEquipmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        Equipment equipment = getActiveEquipment(id);
        if (equipment.getStatus() == EquipmentStatus.RETIRED) {
            throw new BusinessConflictException("Retired equipment cannot be updated");
        }

        if (StringUtils.hasText(request.getName())) {
            equipment.setName(request.getName().trim());
        }
        if (StringUtils.hasText(request.getLocation())) {
            equipment.setLocation(request.getLocation().trim());
        }
        equipment.setManufacturer(blankToNull(request.getManufacturer()));
        equipment.setModel(blankToNull(request.getModel()));
        equipment.setSerialNumber(blankToNull(request.getSerialNumber()));
        equipment.setInstallationDate(request.getInstallationDate());
        if (request.getCalibrationIntervalMonths() != null) {
            equipment.setCalibrationIntervalMonths(request.getCalibrationIntervalMonths());
        }
        equipment.setResponsibleAnalyst(blankToNull(request.getResponsibleAnalyst()));
        if (request.getStatus() != null) {
            equipment.setStatus(request.getStatus());
        }
        equipment.setUpdatedBy(actor);
        equipment.setUpdatedAt(OffsetDateTime.now());

        Equipment saved = equipmentRepository.save(equipment);
        auditEventService.record(
                "EQUIPMENT",
                saved.getId(),
                AuditEventType.UPDATE,
                "details",
                null,
                "UPDATED",
                "Equipment details updated",
                actor,
                "EQUIPMENT"
        );
        return EquipmentResponse.toResponse(saved);
    }

    @Override
    @Transactional
    public QualificationRecordResponse addQualificationRecord(UUID equipmentId, CreateQualificationRecordRequest request) {
        String actor = authenticatedActorService.currentActor();
        Equipment equipment = getActiveEquipment(equipmentId);

        UUID eSignatureId = null;
        boolean needsESign = (request.getResult() == QualificationResult.PASS
                || request.getResult() == QualificationResult.CONDITIONAL_PASS)
                && (request.getQualificationType() == QualificationType.PQ
                || request.getQualificationType() == QualificationType.REQUALIFICATION);

        if (needsESign) {
            ESignatureRequest signatureRequest = new ESignatureRequest();
            signatureRequest.setUsername(request.getUsername());
            signatureRequest.setPassword(request.getPassword());
            signatureRequest.setMeaning(StringUtils.hasText(request.getSignatureMeaning())
                    ? request.getSignatureMeaning()
                    : "I certify qualification/requalification result as " + request.getResult().name());
            ESignatureRecordResponse signature = eSignatureService.sign(
                    "EQUIPMENT",
                    equipmentId,
                    "QUALIFICATION_APPROVED",
                    "I certify qualification/requalification result",
                    actor,
                    signatureRequest,
                    "Qualification record added: " + request.getQualificationType().name()
            );
            eSignatureId = signature.getId();

            equipment.setLastQualificationDate(request.getPerformedAt());
            equipment.setNextQualificationDue(request.getNextRequalificationDue());
            equipment.setStatus(EquipmentStatus.ACTIVE);
        }

        if (request.getResult() == QualificationResult.FAIL) {
            equipment.setStatus(EquipmentStatus.UNDER_MAINTENANCE);
        }

        if (request.getQualificationType() == QualificationType.CALIBRATION
                && request.getResult() == QualificationResult.PASS) {
            equipment.setLastCalibrationDate(request.getPerformedAt());
            Integer interval = equipment.getCalibrationIntervalMonths() != null
                    ? equipment.getCalibrationIntervalMonths() : 12;
            equipment.setNextCalibrationDue(request.getPerformedAt().plusMonths(interval));
        }

        equipment.setUpdatedBy(actor);
        equipment.setUpdatedAt(OffsetDateTime.now());
        equipmentRepository.save(equipment);

        EquipmentQualificationRecord record = EquipmentQualificationRecord.builder()
                .id(UUID.randomUUID())
                .equipmentId(equipmentId)
                .qualificationType(request.getQualificationType())
                .protocolReference(request.getProtocolReference().trim())
                .performedBy(request.getPerformedBy().trim())
                .performedAt(request.getPerformedAt())
                .reviewedBy(blankToNull(request.getReviewedBy()))
                .reviewedAt(request.getReviewedAt())
                .result(request.getResult())
                .deviationNoted(blankToNull(request.getDeviationNoted()))
                .nextRequalificationDue(request.getNextRequalificationDue())
                .calibrationCertificateNumber(blankToNull(request.getCalibrationCertificateNumber()))
                .calibrationCertificateExpiry(request.getCalibrationCertificateExpiry())
                .eSignatureId(eSignatureId)
                .isActive(true)
                .createdBy(actor)
                .createdAt(OffsetDateTime.now())
                .build();

        EquipmentQualificationRecord saved = qualificationRecordRepository.save(record);
        auditEventService.record(
                "EQUIPMENT",
                equipmentId,
                AuditEventType.CREATE,
                "qualificationRecord",
                null,
                request.getResult().name(),
                "Qualification record added: " + request.getQualificationType().name(),
                actor,
                "EQUIPMENT"
        );
        return toRecordResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QualificationRecordResponse> getQualificationRecords(UUID equipmentId) {
        getActiveEquipment(equipmentId);
        return qualificationRecordRepository
                .findByEquipmentIdAndIsActiveTrueOrderByPerformedAtDesc(equipmentId)
                .stream()
                .map(this::toRecordResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EquipmentSummaryResponse getSummary() {
        Map<EquipmentStatus, Long> statusCounts = new EnumMap<>(EquipmentStatus.class);
        for (EquipmentStatus s : EquipmentStatus.values()) {
            statusCounts.put(s, 0L);
        }
        for (Object[] row : equipmentRepository.countActiveByStatus()) {
            statusCounts.put((EquipmentStatus) row[0], (Long) row[1]);
        }

        LocalDate today = LocalDate.now();
        LocalDate soon = today.plusDays(30);

        long calibrationOverdue = equipmentRepository
                .findByIsActiveTrueAndNextCalibrationDueBefore(today)
                .stream()
                .filter(e -> e.getStatus() != EquipmentStatus.RETIRED)
                .count();

        long qualificationOverdue = equipmentRepository
                .findByIsActiveTrueAndNextQualificationDueBefore(today)
                .stream()
                .filter(e -> e.getStatus() != EquipmentStatus.RETIRED)
                .count();

        long calibrationDueSoon = equipmentRepository.findCalibrationDueSoon(today, soon).size();

        long qualificationDueSoon = equipmentRepository.findQualificationDueSoon(today, soon).size();

        return EquipmentSummaryResponse.builder()
                .totalActive(statusCounts.get(EquipmentStatus.ACTIVE))
                .pendingQualification(statusCounts.get(EquipmentStatus.PENDING_QUALIFICATION))
                .underMaintenance(statusCounts.get(EquipmentStatus.UNDER_MAINTENANCE))
                .calibrationDueSoon(calibrationDueSoon)
                .qualificationDueSoon(qualificationDueSoon)
                .calibrationOverdue(calibrationOverdue)
                .qualificationOverdue(qualificationOverdue)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EquipmentResponse> getActiveInstruments() {
        return equipmentRepository.findByIsActiveTrueAndStatus(EquipmentStatus.ACTIVE)
                .stream()
                .map(EquipmentResponse::toResponse)
                .collect(Collectors.toList());
    }

    private String generateEquipmentId(EquipmentType type) {
        String prefix = "EQ-" + typeAbbr(type) + "-";
        for (int i = 1; i <= 9999; i++) {
            String candidate = prefix + String.format("%04d", i);
            if (!equipmentRepository.existsByEquipmentId(candidate)) {
                return candidate;
            }
        }
        throw new BusinessConflictException("Unable to generate a unique equipment ID for type: " + type);
    }

    private String typeAbbr(EquipmentType type) {
        return switch (type) {
            case HPLC -> "HPLC";
            case GC -> "GC";
            case BALANCE -> "BAL";
            case UV_SPECTROPHOTOMETER -> "UV";
            case IR_SPECTROPHOTOMETER -> "IR";
            case PH_METER -> "PHM";
            case KF_TITRATOR -> "KFT";
            case DISSOLUTION -> "DIS";
            case PARTICLE_SIZE -> "PAS";
            case TOC_ANALYZER -> "TOC";
            case STABILITY_CHAMBER -> "STB";
            case REFRIGERATOR -> "REF";
            case AUTOCLAVE -> "AUT";
            case LAB_COMPUTER -> "LPC";
            case OTHER -> "EQ";
        };
    }

    private Equipment getActiveEquipment(UUID id) {
        return equipmentRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id));
    }

    private QualificationRecordResponse toRecordResponse(EquipmentQualificationRecord r) {
        return QualificationRecordResponse.builder()
                .id(r.getId())
                .equipmentId(r.getEquipmentId())
                .qualificationType(r.getQualificationType())
                .protocolReference(r.getProtocolReference())
                .performedBy(r.getPerformedBy())
                .performedAt(r.getPerformedAt())
                .reviewedBy(r.getReviewedBy())
                .reviewedAt(r.getReviewedAt())
                .result(r.getResult())
                .deviationNoted(r.getDeviationNoted())
                .nextRequalificationDue(r.getNextRequalificationDue())
                .calibrationCertificateNumber(r.getCalibrationCertificateNumber())
                .calibrationCertificateExpiry(r.getCalibrationCertificateExpiry())
                .eSignatureId(r.getESignatureId())
                .isActive(r.getIsActive())
                .createdBy(r.getCreatedBy())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
