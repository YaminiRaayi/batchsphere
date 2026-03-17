package com.batchsphere.core.transcations.sampling.service;

import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.transcations.grn.entity.GrnItem;
import com.batchsphere.core.transcations.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transcations.sampling.dto.SamplingPlanResponse;
import com.batchsphere.core.transcations.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transcations.sampling.dto.UpdateSamplingPlanRequest;
import com.batchsphere.core.transcations.inventory.entity.InventoryStatus;
import com.batchsphere.core.transcations.inventory.service.InventoryServiceImpl;
import com.batchsphere.core.transcations.sampling.entity.SamplingMethod;
import com.batchsphere.core.transcations.sampling.entity.SamplingPlan;
import com.batchsphere.core.transcations.sampling.entity.SamplingRequest;
import com.batchsphere.core.transcations.sampling.entity.SamplingRequestStatus;
import com.batchsphere.core.transcations.sampling.repository.SamplingPlanRepository;
import com.batchsphere.core.transcations.sampling.repository.SamplingRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SamplingServiceImpl implements SamplingService {

    private final SamplingRequestRepository samplingRequestRepository;
    private final SamplingPlanRepository samplingPlanRepository;
    private final MaterialRepository materialRepository;
    private final InventoryServiceImpl inventoryService;

    @Override
    @Transactional
    public void createSamplingRequestsForGrn(UUID grnId, List<GrnItem> items, String actor) {
        LocalDateTime now = LocalDateTime.now();

        for (GrnItem item : items) {
            if (samplingRequestRepository.findByGrnItemId(item.getId()).isPresent()) {
                continue;
            }

            Material material = materialRepository.findById(item.getMaterialId())
                    .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + item.getMaterialId()));

            if (!Boolean.TRUE.equals(material.getSamplingRequired()) && !Boolean.TRUE.equals(material.getVendorCoaReleaseAllowed())) {
                throw new BusinessConflictException("Material must either require sampling or allow vendor CoA release");
            }

            SamplingRequest samplingRequest = SamplingRequest.builder()
                    .id(UUID.randomUUID())
                    .grnId(grnId)
                    .grnItemId(item.getId())
                    .materialId(item.getMaterialId())
                    .batchId(item.getBatchId())
                    .palletId(item.getPalletId())
                    .requestStatus(Boolean.TRUE.equals(material.getSamplingRequired())
                            ? SamplingRequestStatus.REQUESTED
                            : SamplingRequestStatus.RELEASED_WITH_COA)
                    .warehouseLabelApplied(true)
                    .samplingLabelRequired(true)
                    .vendorCoaReleaseAllowed(material.getVendorCoaReleaseAllowed())
                    .photosensitiveMaterial(material.getPhotosensitive())
                    .hygroscopicMaterial(material.getHygroscopic())
                    .hazardousMaterial(material.getHazardous())
                    .selectiveMaterial(material.getSelectiveMaterial())
                    .remarks("Auto-created from GRN receipt")
                    .isActive(true)
                    .createdBy(actor)
                    .createdAt(now)
                    .build();

            samplingRequestRepository.save(samplingRequest);

            if (item.getAcceptedQuantity().signum() > 0 && item.getBatchId() != null) {
                inventoryService.updateInventoryStatus(
                        item.getMaterialId(),
                        item.getBatchId(),
                        item.getPalletId(),
                        Boolean.TRUE.equals(material.getSamplingRequired()) ? InventoryStatus.QUARANTINE : InventoryStatus.QUARANTINE,
                        actor
                );
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SamplingRequestResponse> getAllSamplingRequests(Pageable pageable) {
        return samplingRequestRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public SamplingRequestResponse getSamplingRequestById(UUID id) {
        return toResponse(getSamplingRequest(id));
    }

    @Override
    @Transactional
    public SamplingRequestResponse createSamplingPlan(UUID samplingRequestId, CreateSamplingPlanRequest request) {
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        if (samplingPlanRepository.findBySamplingRequestId(samplingRequestId).isPresent()) {
            throw new BusinessConflictException("Sampling plan already exists for request: " + samplingRequestId);
        }

        validatePlanRequest(samplingRequest, request.getSamplingMethod(), request.getContainersToSample(), request.getTotalContainers());

        SamplingPlan plan = SamplingPlan.builder()
                .id(UUID.randomUUID())
                .samplingRequestId(samplingRequestId)
                .samplingMethod(request.getSamplingMethod())
                .sampleType(request.getSampleType())
                .totalContainers(request.getTotalContainers())
                .containersToSample(request.getContainersToSample())
                .individualSampleQuantity(request.getIndividualSampleQuantity())
                .compositeSampleQuantity(request.getCompositeSampleQuantity())
                .samplingLocation(request.getSamplingLocation())
                .samplingToolInfo(request.getSamplingToolInfo())
                .photosensitiveHandlingRequired(request.getPhotosensitiveHandlingRequired())
                .hygroscopicHandlingRequired(request.getHygroscopicHandlingRequired())
                .coaBasedRelease(request.getCoaBasedRelease())
                .rationale(request.getRationale())
                .samplingLabelApplied(false)
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        samplingPlanRepository.save(plan);
        boolean coaRelease = request.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE;
        samplingRequest.setRequestStatus(coaRelease
                ? SamplingRequestStatus.RELEASED_WITH_COA
                : SamplingRequestStatus.PLAN_DEFINED);
        samplingRequest.setUpdatedBy(request.getCreatedBy());
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        if (samplingRequest.getBatchId() != null) {
            inventoryService.updateInventoryStatus(
                    samplingRequest.getMaterialId(),
                    samplingRequest.getBatchId(),
                    samplingRequest.getPalletId(),
                    coaRelease ? InventoryStatus.RELEASED : InventoryStatus.SAMPLING,
                    request.getCreatedBy()
            );
        }

        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse updateSamplingPlan(UUID samplingRequestId, UUID planId, UpdateSamplingPlanRequest request) {
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found with id: " + planId));
        if (!plan.getSamplingRequestId().equals(samplingRequestId)) {
            throw new BusinessConflictException("Sampling plan does not belong to sampling request");
        }

        validatePlanRequest(samplingRequest, request.getSamplingMethod(), request.getContainersToSample(), request.getTotalContainers());

        plan.setSamplingMethod(request.getSamplingMethod());
        plan.setSampleType(request.getSampleType());
        plan.setTotalContainers(request.getTotalContainers());
        plan.setContainersToSample(request.getContainersToSample());
        plan.setIndividualSampleQuantity(request.getIndividualSampleQuantity());
        plan.setCompositeSampleQuantity(request.getCompositeSampleQuantity());
        plan.setSamplingLocation(request.getSamplingLocation());
        plan.setSamplingToolInfo(request.getSamplingToolInfo());
        plan.setPhotosensitiveHandlingRequired(request.getPhotosensitiveHandlingRequired());
        plan.setHygroscopicHandlingRequired(request.getHygroscopicHandlingRequired());
        plan.setCoaBasedRelease(request.getCoaBasedRelease());
        plan.setRationale(request.getRationale());
        plan.setUpdatedBy(request.getUpdatedBy());
        plan.setUpdatedAt(LocalDateTime.now());
        samplingPlanRepository.save(plan);

        boolean coaRelease = request.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE;
        samplingRequest.setRequestStatus(coaRelease
                ? SamplingRequestStatus.RELEASED_WITH_COA
                : SamplingRequestStatus.PLAN_DEFINED);
        samplingRequest.setUpdatedBy(request.getUpdatedBy());
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        if (samplingRequest.getBatchId() != null) {
            inventoryService.updateInventoryStatus(
                    samplingRequest.getMaterialId(),
                    samplingRequest.getBatchId(),
                    samplingRequest.getPalletId(),
                    coaRelease ? InventoryStatus.RELEASED : InventoryStatus.SAMPLING,
                    request.getUpdatedBy()
            );
        }

        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse updateSamplingLabel(UUID samplingRequestId, Boolean samplingLabelApplied, String updatedBy) {
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        plan.setSamplingLabelApplied(Boolean.TRUE.equals(samplingLabelApplied));
        plan.setUpdatedBy(updatedBy);
        plan.setUpdatedAt(LocalDateTime.now());
        samplingPlanRepository.save(plan);

        samplingRequest.setUpdatedBy(updatedBy);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        return toResponse(samplingRequest);
    }

    private void validatePlanRequest(SamplingRequest samplingRequest, SamplingMethod method, Integer containersToSample, Integer totalContainers) {
        if (containersToSample > totalContainers) {
            throw new BusinessConflictException("Containers to sample cannot exceed total containers");
        }

        if (method == SamplingMethod.COA_BASED_RELEASE) {
            if (!Boolean.TRUE.equals(samplingRequest.getVendorCoaReleaseAllowed())
                    && !Boolean.TRUE.equals(samplingRequest.getHazardousMaterial())
                    && !Boolean.TRUE.equals(samplingRequest.getSelectiveMaterial())) {
                throw new BusinessConflictException("CoA based release is only allowed for eligible materials");
            }
        }
    }

    private SamplingRequest getSamplingRequest(UUID id) {
        SamplingRequest samplingRequest = samplingRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling request not found with id: " + id));
        if (!Boolean.TRUE.equals(samplingRequest.getIsActive())) {
            throw new ResourceNotFoundException("Sampling request not found with id: " + id);
        }
        return samplingRequest;
    }

    private SamplingRequestResponse toResponse(SamplingRequest request) {
        return SamplingRequestResponse.builder()
                .id(request.getId())
                .grnId(request.getGrnId())
                .grnItemId(request.getGrnItemId())
                .materialId(request.getMaterialId())
                .batchId(request.getBatchId())
                .palletId(request.getPalletId())
                .requestStatus(request.getRequestStatus())
                .warehouseLabelApplied(request.getWarehouseLabelApplied())
                .samplingLabelRequired(request.getSamplingLabelRequired())
                .vendorCoaReleaseAllowed(request.getVendorCoaReleaseAllowed())
                .photosensitiveMaterial(request.getPhotosensitiveMaterial())
                .hygroscopicMaterial(request.getHygroscopicMaterial())
                .hazardousMaterial(request.getHazardousMaterial())
                .selectiveMaterial(request.getSelectiveMaterial())
                .remarks(request.getRemarks())
                .isActive(request.getIsActive())
                .createdBy(request.getCreatedBy())
                .createdAt(request.getCreatedAt())
                .updatedBy(request.getUpdatedBy())
                .updatedAt(request.getUpdatedAt())
                .plan(samplingPlanRepository.findBySamplingRequestId(request.getId()).map(this::toPlanResponse).orElse(null))
                .build();
    }

    private SamplingPlanResponse toPlanResponse(SamplingPlan plan) {
        return SamplingPlanResponse.builder()
                .id(plan.getId())
                .samplingRequestId(plan.getSamplingRequestId())
                .samplingMethod(plan.getSamplingMethod())
                .sampleType(plan.getSampleType())
                .totalContainers(plan.getTotalContainers())
                .containersToSample(plan.getContainersToSample())
                .individualSampleQuantity(plan.getIndividualSampleQuantity())
                .compositeSampleQuantity(plan.getCompositeSampleQuantity())
                .samplingLocation(plan.getSamplingLocation())
                .samplingToolInfo(plan.getSamplingToolInfo())
                .photosensitiveHandlingRequired(plan.getPhotosensitiveHandlingRequired())
                .hygroscopicHandlingRequired(plan.getHygroscopicHandlingRequired())
                .coaBasedRelease(plan.getCoaBasedRelease())
                .rationale(plan.getRationale())
                .samplingLabelApplied(plan.getSamplingLabelApplied())
                .isActive(plan.getIsActive())
                .createdBy(plan.getCreatedBy())
                .createdAt(plan.getCreatedAt())
                .updatedBy(plan.getUpdatedBy())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }
}
