package com.batchsphere.core.lims.retentionsample.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.lims.retentionsample.dto.CreateRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.dto.DisposeRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.dto.RetentionSampleResponse;
import com.batchsphere.core.lims.retentionsample.dto.RetentionSampleSummaryResponse;
import com.batchsphere.core.lims.retentionsample.dto.RetrieveRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.entity.RetentionSample;
import com.batchsphere.core.lims.retentionsample.entity.RetentionSampleStatus;
import com.batchsphere.core.lims.retentionsample.repository.RetentionSampleRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RetentionSampleServiceImpl implements RetentionSampleService {

    private final RetentionSampleRepository retentionSampleRepository;
    private final SamplingRequestRepository samplingRequestRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public RetentionSampleResponse createRetentionSample(CreateRetentionSampleRequest request) {
        if (!samplingRequestRepository.existsById(request.getSamplingRequestId())) {
            throw new ResourceNotFoundException("SamplingRequest not found: " + request.getSamplingRequestId());
        }

        String actor = authenticatedActorService.currentActor();
        OffsetDateTime now = OffsetDateTime.now();

        LocalDate retentionUntil = request.getRetentionUntil() != null
                ? request.getRetentionUntil()
                : LocalDate.now().plusYears(2);

        RetentionSample sample = RetentionSample.builder()
                .id(UUID.randomUUID())
                .samplingRequestId(request.getSamplingRequestId())
                .lotNumber(request.getLotNumber().trim())
                .materialId(request.getMaterialId())
                .materialName(request.getMaterialName())
                .quantity(request.getQuantity())
                .uom(request.getUom().trim())
                .containerDescription(request.getContainerDescription())
                .storageLocation(request.getStorageLocation().trim())
                .storageCondition(request.getStorageCondition())
                .retentionUntil(retentionUntil)
                .status(RetentionSampleStatus.STORED)
                .receivedBy(actor)
                .receivedAt(now)
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();

        return toResponse(retentionSampleRepository.save(sample));
    }

    @Override
    public RetentionSampleResponse getById(UUID id) {
        return toResponse(findActiveOrThrow(id));
    }

    @Override
    public Page<RetentionSampleResponse> findByFilters(String status, UUID materialId, String lotNumber, Pageable pageable) {
        RetentionSampleStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = RetentionSampleStatus.valueOf(status.toUpperCase());
        }
        String lotFilter = (lotNumber != null && !lotNumber.isBlank()) ? lotNumber : null;
        return retentionSampleRepository.findByFilters(statusEnum, materialId, lotFilter, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public RetentionSampleResponse retrieveSample(UUID id, RetrieveRetentionSampleRequest request) {
        RetentionSample sample = findActiveOrThrow(id);
        String actor = authenticatedActorService.currentActor();
        OffsetDateTime now = OffsetDateTime.now();

        sample.setStatus(RetentionSampleStatus.RETRIEVED);
        sample.setRetrievalReason(request.getRetrievalReason());
        sample.setRetrievedBy(actor);
        sample.setRetrievedAt(now);
        sample.setTestResultReference(request.getTestResultReference());
        sample.setUpdatedBy(actor);
        sample.setUpdatedAt(now);

        return toResponse(retentionSampleRepository.save(sample));
    }

    @Override
    @Transactional
    public RetentionSampleResponse disposeSample(UUID id, DisposeRetentionSampleRequest request) {
        RetentionSample sample = findActiveOrThrow(id);
        String actor = authenticatedActorService.currentActor();
        OffsetDateTime now = OffsetDateTime.now();

        sample.setStatus(RetentionSampleStatus.DISPOSED);
        sample.setDisposalReason(request.getDisposalReason());
        sample.setDisposalMethod(request.getDisposalMethod());
        sample.setDisposedBy(actor);
        sample.setDisposedAt(now);
        sample.setUpdatedBy(actor);
        sample.setUpdatedAt(now);

        return toResponse(retentionSampleRepository.save(sample));
    }

    @Override
    public List<RetentionSampleResponse> findDueForDisposal() {
        return retentionSampleRepository
                .findByIsActiveTrueAndStatusAndRetentionUntilBefore(RetentionSampleStatus.STORED, LocalDate.now())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<RetentionSampleResponse> findExpiringSoon(int daysAhead) {
        LocalDate today = LocalDate.now();
        LocalDate cutoff = today.plusDays(daysAhead);
        return retentionSampleRepository
                .findExpiringSoon(RetentionSampleStatus.STORED, today, cutoff)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public RetentionSampleSummaryResponse getSummary() {
        LocalDate today = LocalDate.now();
        OffsetDateTime startOfMonth = OffsetDateTime.now().withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);

        return RetentionSampleSummaryResponse.builder()
                .totalStored(retentionSampleRepository.countByIsActiveTrueAndStatus(RetentionSampleStatus.STORED))
                .expiringIn30Days(retentionSampleRepository.findExpiringSoon(
                        RetentionSampleStatus.STORED, today, today.plusDays(30)).size())
                .overdueDisposal(retentionSampleRepository.countOverdueDisposal(today))
                .retrievedThisMonth(retentionSampleRepository.countRetrievedSince(startOfMonth))
                .build();
    }

    private RetentionSample findActiveOrThrow(UUID id) {
        return retentionSampleRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("RetentionSample not found: " + id));
    }

    private RetentionSampleResponse toResponse(RetentionSample s) {
        long daysUntilExpiry = ChronoUnit.DAYS.between(LocalDate.now(), s.getRetentionUntil());
        return RetentionSampleResponse.builder()
                .id(s.getId())
                .samplingRequestId(s.getSamplingRequestId())
                .lotNumber(s.getLotNumber())
                .materialId(s.getMaterialId())
                .materialName(s.getMaterialName())
                .quantity(s.getQuantity())
                .uom(s.getUom())
                .containerDescription(s.getContainerDescription())
                .storageLocation(s.getStorageLocation())
                .storageCondition(s.getStorageCondition())
                .retentionUntil(s.getRetentionUntil())
                .daysUntilExpiry(daysUntilExpiry)
                .status(s.getStatus())
                .receivedBy(s.getReceivedBy())
                .receivedAt(s.getReceivedAt())
                .retrievalReason(s.getRetrievalReason())
                .retrievedBy(s.getRetrievedBy())
                .retrievedAt(s.getRetrievedAt())
                .testResultReference(s.getTestResultReference())
                .disposalReason(s.getDisposalReason())
                .disposedBy(s.getDisposedBy())
                .disposedAt(s.getDisposedAt())
                .disposalMethod(s.getDisposalMethod())
                .createdBy(s.getCreatedBy())
                .createdAt(s.getCreatedAt())
                .updatedBy(s.getUpdatedBy())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
