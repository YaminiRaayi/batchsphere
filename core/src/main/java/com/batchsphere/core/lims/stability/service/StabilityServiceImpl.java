package com.batchsphere.core.lims.stability.service;

import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.compliance.esign.service.ESignatureService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.CreateStabilityStudyRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.PullTimepointRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.RecordStabilityResultRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityResultResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityStudyDetailResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityStudySummaryResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityTimepointResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.TrendPoint;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.TrendSeries;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.UpdateStabilityStatusRequest;
import com.batchsphere.core.lims.stability.entity.StabilityResult;
import com.batchsphere.core.lims.stability.entity.StabilityStudy;
import com.batchsphere.core.lims.stability.entity.StabilityTimepoint;
import com.batchsphere.core.lims.stability.repository.StabilityResultRepository;
import com.batchsphere.core.lims.stability.repository.StabilityStudyRepository;
import com.batchsphere.core.lims.stability.repository.StabilityTimepointRepository;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StabilityServiceImpl implements StabilityService {
    private final StabilityStudyRepository studyRepository;
    private final StabilityTimepointRepository timepointRepository;
    private final StabilityResultRepository resultRepository;
    private final SpecParameterRepository specParameterRepository;
    private final AuditEventService auditEventService;
    private final ESignatureService eSignatureService;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public StabilityStudyDetailResponse createStudy(CreateStabilityStudyRequest request) {
        String studyNumber = required(request.getStudyNumber(), "studyNumber");
        if (studyRepository.existsByStudyNumberIgnoreCase(studyNumber)) {
            throw new DuplicateResourceException("Stability study already exists: " + studyNumber);
        }
        List<Integer> protocol = request.getProtocolMonths() == null ? List.of() : request.getProtocolMonths().stream().distinct().sorted().toList();
        if (protocol.isEmpty()) {
            throw new BusinessConflictException("protocolMonths is required");
        }
        StabilityStudy study = StabilityStudy.builder()
                .id(UUID.randomUUID())
                .studyNumber(studyNumber)
                .materialId(request.getMaterialId())
                .productName(required(request.getProductName(), "productName"))
                .batchNumber(trim(request.getBatchNumber()))
                .conditionLabel(required(request.getConditionLabel(), "conditionLabel"))
                .storageCondition(trim(request.getStorageCondition()))
                .startDate(request.getStartDate())
                .ootThresholdPct(request.getOotThresholdPct() != null ? request.getOotThresholdPct() : BigDecimal.TEN)
                .createdBy(actor(request.getCreatedBy()))
                .createdAt(LocalDateTime.now())
                .build();
        if (study.getStartDate() == null) {
            throw new BusinessConflictException("startDate is required");
        }
        studyRepository.save(study);
        List<StabilityTimepoint> timepoints = protocol.stream()
                .map(month -> StabilityTimepoint.builder()
                        .id(UUID.randomUUID())
                        .studyId(study.getId())
                        .monthOffset(month)
                        .scheduledDate(study.getStartDate().plusMonths(month))
                        .createdBy(study.getCreatedBy())
                        .createdAt(LocalDateTime.now())
                        .build())
                .toList();
        timepointRepository.saveAll(timepoints);
        auditEventService.record("STABILITY_STUDY", study.getId(), AuditEventType.CREATE, "status", null, study.getStatus(),
                "Study initiated", study.getCreatedBy(), "LIMS_STABILITY");
        return detail(study);
    }

    @Override
    public List<StabilityStudySummaryResponse> listStudies() {
        return studyRepository.findByIsActiveTrueOrderByCreatedAtDesc().stream().map(this::summary).toList();
    }

    @Override
    public StabilityStudyDetailResponse getStudy(UUID id) {
        return detail(study(id));
    }

    @Override
    @Transactional
    public StabilityTimepointResponse pullTimepoint(UUID studyId, UUID timepointId, PullTimepointRequest request) {
        study(studyId);
        StabilityTimepoint timepoint = timepoint(studyId, timepointId);
        if (!"SCHEDULED".equals(timepoint.getStatus())) {
            throw new BusinessConflictException("Pull action blocked unless timepoint status is SCHEDULED");
        }
        timepoint.setStatus("PULLED");
        timepoint.setPulledBy(actor(request.getPulledBy()));
        timepoint.setPulledDate(request.getPulledDate() != null ? request.getPulledDate() : LocalDate.now());
        timepoint.setUpdatedBy(timepoint.getPulledBy());
        timepoint.setUpdatedAt(LocalDateTime.now());
        timepointRepository.save(timepoint);
        auditEventService.record("STABILITY_TIMEPOINT", timepoint.getId(), AuditEventType.UPDATE, "status", "SCHEDULED", "PULLED",
                "Sample pulled", timepoint.getPulledBy(), "LIMS_STABILITY");
        return mapTimepoint(timepoint);
    }

    @Override
    @Transactional
    public StabilityResultResponse recordResult(UUID studyId, UUID timepointId, RecordStabilityResultRequest request) {
        StabilityStudy study = study(studyId);
        StabilityTimepoint timepoint = timepoint(studyId, timepointId);
        if (!"PULLED".equals(timepoint.getStatus())) {
            throw new BusinessConflictException("Result entry blocked unless timepoint status is PULLED");
        }
        SpecParameter parameter = specParameterRepository.findById(request.getSpecParameterId())
                .orElseThrow(() -> new ResourceNotFoundException("Spec parameter not found: " + request.getSpecParameterId()));
        StabilityResult result = resultRepository.findByTimepointIdAndSpecParameterIdAndIsActiveTrue(timepointId, parameter.getId())
                .orElseGet(() -> StabilityResult.builder()
                        .id(UUID.randomUUID())
                        .studyId(studyId)
                        .timepointId(timepointId)
                        .specParameterId(parameter.getId())
                        .createdAt(LocalDateTime.now())
                        .createdBy(actor(request.getEnteredBy()))
                        .build());
        result.setParameterName(StringUtils.hasText(request.getParameterName()) ? request.getParameterName().trim() : parameter.getParameterName());
        result.setResultValue(request.getResultValue());
        result.setResultText(trim(request.getResultText()));
        result.setUnit(StringUtils.hasText(request.getUnit()) ? request.getUnit().trim() : parameter.getUnit());
        result.setEnteredBy(actor(request.getEnteredBy()));
        result.setEnteredAt(LocalDateTime.now());
        result.setUpdatedBy(result.getEnteredBy());
        result.setUpdatedAt(LocalDateTime.now());
        result.setOotFlag(computeOot(study, timepoint, result));
        resultRepository.save(result);
        if (!"COMPLETE".equals(timepoint.getStatus())) {
            String oldStatus = timepoint.getStatus();
            timepoint.setStatus("COMPLETE");
            timepoint.setUpdatedBy(result.getEnteredBy());
            timepoint.setUpdatedAt(LocalDateTime.now());
            timepointRepository.save(timepoint);
            auditEventService.record("STABILITY_TIMEPOINT", timepoint.getId(), AuditEventType.UPDATE, "status", oldStatus, "COMPLETE",
                    "Stability result recorded", result.getEnteredBy(), "LIMS_STABILITY");
        }
        if (Boolean.TRUE.equals(result.getOotFlag())) {
            auditEventService.record("STABILITY_RESULT", result.getId(), AuditEventType.UPDATE, "ootFlag", "false", "true",
                    "OOT flag set", result.getEnteredBy(), "LIMS_STABILITY");
        } else {
            auditEventService.record("STABILITY_RESULT", result.getId(), AuditEventType.CREATE, "resultValue", null,
                    result.getResultValue() != null ? result.getResultValue().toPlainString() : result.getResultText(),
                    "Result recorded", result.getEnteredBy(), "LIMS_STABILITY");
        }
        return mapResult(result);
    }

    @Override
    public List<StabilityTimepointResponse> dueSoon(int days) {
        LocalDate today = LocalDate.now();
        return timepointRepository.findByScheduledDateBetweenAndStatusAndIsActiveTrueOrderByScheduledDateAsc(today, today.plusDays(days), "SCHEDULED")
                .stream()
                .map(this::mapTimepoint)
                .toList();
    }

    @Override
    public List<TrendSeries> trend(UUID studyId) {
        List<StabilityTimepoint> timepoints = timepointRepository.findByStudyIdAndIsActiveTrueOrderByMonthOffsetAsc(studyId);
        Map<UUID, Integer> monthByTimepoint = timepoints.stream().collect(LinkedHashMap::new, (m, tp) -> m.put(tp.getId(), tp.getMonthOffset()), Map::putAll);
        return resultRepository.findByStudyIdAndIsActiveTrueOrderByEnteredAtAsc(studyId).stream()
                .filter(result -> result.getResultValue() != null)
                .collect(Collectors.groupingBy(StabilityResult::getSpecParameterId, LinkedHashMap::new, Collectors.toList()))
                .values()
                .stream()
                .map(results -> TrendSeries.builder()
                        .specParameterId(results.get(0).getSpecParameterId())
                        .parameterName(results.get(0).getParameterName())
                        .unit(results.get(0).getUnit())
                        .points(results.stream()
                                .sorted(Comparator.comparing(result -> monthByTimepoint.getOrDefault(result.getTimepointId(), 0)))
                                .map(result -> TrendPoint.builder()
                                        .monthOffset(monthByTimepoint.get(result.getTimepointId()))
                                        .value(result.getResultValue())
                                        .ootFlag(result.getOotFlag())
                                        .build())
                                .toList())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public StabilityStudySummaryResponse updateStatus(UUID id, UpdateStabilityStatusRequest request) {
        StabilityStudy study = study(id);
        String old = study.getStatus();
        String next = required(request.getStatus(), "status").toUpperCase();
        String actor = actor(request.getUpdatedBy());
        if ("COMPLETED".equals(next)) {
            UserRole role = authenticatedActorService.currentRole();
            if (role != UserRole.QC_MANAGER && role != UserRole.SUPER_ADMIN) {
                throw new BusinessConflictException("Only QC Manager can complete stability study");
            }
            boolean hasOot = resultRepository.existsByStudyIdAndOotFlagTrueAndIsActiveTrue(study.getId());
            if (hasOot && !StringUtils.hasText(request.getOotDisposition())) {
                throw new BusinessConflictException("OOT stability results require manager disposition before study completion");
            }
            ESignatureRequest signatureRequest = new ESignatureRequest();
            signatureRequest.setUsername(request.getUsername());
            signatureRequest.setPassword(request.getPassword());
            signatureRequest.setMeaning(StringUtils.hasText(request.getSignatureMeaning())
                    ? request.getSignatureMeaning()
                    : "I certify stability study completion");
            eSignatureService.sign(
                    "STABILITY_STUDY",
                    study.getId(),
                    "COMPLETED_CLOSURE",
                    "I certify stability study completion",
                    authenticatedActorService.currentActor(),
                    signatureRequest,
                    hasOot ? request.getOotDisposition() : "Stability study completed"
            );
            if (hasOot) {
                auditEventService.record("STABILITY_STUDY", study.getId(), AuditEventType.WORKFLOW_ACTION,
                        "ootDisposition", null, request.getOotDisposition().trim(),
                        "OOT disposition recorded before completion", authenticatedActorService.currentActor(), "LIMS_STABILITY");
            }
        }
        study.setStatus(next);
        study.setUpdatedBy(actor);
        study.setUpdatedAt(LocalDateTime.now());
        studyRepository.save(study);
        auditEventService.record("STABILITY_STUDY", study.getId(), AuditEventType.WORKFLOW_ACTION, "status", old, study.getStatus(),
                "Study status changed", actor, "LIMS_STABILITY");
        return summary(study);
    }

    private boolean computeOot(StabilityStudy study, StabilityTimepoint current, StabilityResult result) {
        if (result.getResultValue() == null) {
            return false;
        }
        List<StabilityTimepoint> priorTimepoints = timepointRepository.findByStudyIdAndIsActiveTrueOrderByMonthOffsetAsc(study.getId()).stream()
                .filter(tp -> tp.getMonthOffset() < current.getMonthOffset())
                .toList();
        List<StabilityResult> priorResults = resultRepository.findByStudyIdAndSpecParameterIdAndIsActiveTrue(study.getId(), result.getSpecParameterId());
        return priorTimepoints.stream()
                .sorted(Comparator.comparing(StabilityTimepoint::getMonthOffset).reversed())
                .flatMap(tp -> priorResults.stream().filter(prev -> prev.getTimepointId().equals(tp.getId()) && prev.getResultValue() != null).findFirst().stream())
                .findFirst()
                .map(prev -> {
                    if (prev.getResultValue().compareTo(BigDecimal.ZERO) == 0) return false;
                    BigDecimal pctChange = result.getResultValue()
                            .subtract(prev.getResultValue()).abs()
                            .divide(prev.getResultValue(), 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100));
                    return pctChange.compareTo(study.getOotThresholdPct()) > 0;
                })
                .orElse(false);
    }

    private StabilityStudyDetailResponse detail(StabilityStudy study) {
        List<StabilityTimepointResponse> timepoints = timepointRepository.findByStudyIdAndIsActiveTrueOrderByMonthOffsetAsc(study.getId())
                .stream().map(this::mapTimepoint).toList();
        List<StabilityResultResponse> results = resultRepository.findByStudyIdAndIsActiveTrueOrderByEnteredAtAsc(study.getId())
                .stream().map(this::mapResult).toList();
        return StabilityStudyDetailResponse.builder().study(summary(study)).timepoints(timepoints).results(results).build();
    }

    private StabilityStudySummaryResponse summary(StabilityStudy study) {
        List<StabilityTimepoint> timepoints = timepointRepository.findByStudyIdAndIsActiveTrueOrderByMonthOffsetAsc(study.getId());
        List<StabilityResult> results = resultRepository.findByStudyIdAndIsActiveTrueOrderByEnteredAtAsc(study.getId());
        return StabilityStudySummaryResponse.builder()
                .id(study.getId())
                .studyNumber(study.getStudyNumber())
                .materialId(study.getMaterialId())
                .productName(study.getProductName())
                .batchNumber(study.getBatchNumber())
                .conditionLabel(study.getConditionLabel())
                .storageCondition(study.getStorageCondition())
                .startDate(study.getStartDate())
                .ootThresholdPct(study.getOotThresholdPct())
                .status(study.getStatus())
                .completedTimepoints(timepoints.stream().filter(tp -> "COMPLETE".equals(tp.getStatus())).count())
                .totalTimepoints(timepoints.size())
                .hasOotAlert(results.stream().anyMatch(result -> Boolean.TRUE.equals(result.getOotFlag())))
                .createdAt(study.getCreatedAt())
                .build();
    }

    private StabilityTimepointResponse mapTimepoint(StabilityTimepoint timepoint) {
        return StabilityTimepointResponse.builder()
                .id(timepoint.getId())
                .studyId(timepoint.getStudyId())
                .monthOffset(timepoint.getMonthOffset())
                .scheduledDate(timepoint.getScheduledDate())
                .pulledDate(timepoint.getPulledDate())
                .pulledBy(timepoint.getPulledBy())
                .status(timepoint.getStatus())
                .build();
    }

    private StabilityResultResponse mapResult(StabilityResult result) {
        return StabilityResultResponse.builder()
                .id(result.getId())
                .studyId(result.getStudyId())
                .timepointId(result.getTimepointId())
                .specParameterId(result.getSpecParameterId())
                .parameterName(result.getParameterName())
                .resultValue(result.getResultValue())
                .resultText(result.getResultText())
                .unit(result.getUnit())
                .ootFlag(result.getOotFlag())
                .enteredBy(result.getEnteredBy())
                .enteredAt(result.getEnteredAt())
                .build();
    }

    private StabilityStudy study(UUID id) {
        return studyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Stability study not found: " + id));
    }

    private StabilityTimepoint timepoint(UUID studyId, UUID timepointId) {
        return timepointRepository.findById(timepointId)
                .filter(item -> item.getStudyId().equals(studyId))
                .orElseThrow(() -> new ResourceNotFoundException("Stability timepoint not found: " + timepointId));
    }

    private String required(String value, String field) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessConflictException(field + " is required");
        }
        return value.trim();
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String actor(String value) {
        return StringUtils.hasText(value) ? value.trim() : "system";
    }
}
