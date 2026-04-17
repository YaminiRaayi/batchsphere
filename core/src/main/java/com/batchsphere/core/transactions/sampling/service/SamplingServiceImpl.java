package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.samplingtool.repository.SamplingToolRepository;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import com.batchsphere.core.transactions.grn.entity.GrnContainer;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.repository.GrnContainerRepository;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.service.InventoryServiceImpl;
import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingPlanResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.UpdateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.entity.SamplingContainerSample;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import com.batchsphere.core.transactions.sampling.entity.SamplingPlan;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import com.batchsphere.core.transactions.sampling.repository.SamplingContainerSampleRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingPlanRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SamplingServiceImpl implements SamplingService {

    private final SamplingRequestRepository samplingRequestRepository;
    private final SamplingPlanRepository samplingPlanRepository;
    private final SamplingContainerSampleRepository samplingContainerSampleRepository;
    private final MaterialRepository materialRepository;
    private final SpecRepository specRepository;
    private final MoaRepository moaRepository;
    private final SamplingToolRepository samplingToolRepository;
    private final GrnContainerRepository grnContainerRepository;
    private final InventoryServiceImpl inventoryService;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    @Transactional
    public void createSamplingRequestsForGrn(UUID grnId, List<GrnItem> items, String actor) {
        LocalDateTime now = LocalDateTime.now();

        for (GrnItem item : items) {
            if (samplingRequestRepository.findByGrnItemId(item.getId()).isPresent()) {
                continue;
            }

            Material material = getMaterial(item.getMaterialId());
            SamplingRequest samplingRequest = SamplingRequest.builder()
                    .id(UUID.randomUUID())
                    .grnId(grnId)
                    .grnItemId(item.getId())
                    .materialId(item.getMaterialId())
                    .batchId(item.getBatchId())
                    .warehouseLocation(item.getWarehouseLocation())
                    .palletId(item.getPalletId())
                    .totalContainers(item.getNumberOfContainers())
                    .requestStatus(SamplingRequestStatus.REQUESTED)
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
                        InventoryStatus.QUARANTINE,
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
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        if (samplingPlanRepository.findBySamplingRequestId(samplingRequestId).isPresent()) {
            throw new BusinessConflictException("Sampling plan already exists for request: " + samplingRequestId);
        }

        Material material = getMaterial(samplingRequest.getMaterialId());
        SamplingMethod resolvedMethod = resolveSamplingMethod(material, samplingRequest, request.getSpecId(), request.getSamplingMethod());
        int resolvedContainersToSample = calculateContainersToSample(resolvedMethod, request.getTotalContainers());
        BigDecimal compositeQuantity = calculateCompositeSampleQuantity(request.getContainerSamples(), resolvedMethod);

        validatePlanRequest(samplingRequest, request.getTotalContainers(), resolvedMethod, request.getSpecId(), request.getMoaId(), request.getSamplingToolId(), request.getContainerSamples());

        SamplingPlan plan = SamplingPlan.builder()
                .id(UUID.randomUUID())
                .samplingRequestId(samplingRequestId)
                .specId(request.getSpecId())
                .moaId(request.getMoaId())
                .samplingMethod(resolvedMethod)
                .sampleType(request.getSampleType())
                .totalContainers(request.getTotalContainers())
                .containersToSample(resolvedContainersToSample)
                .individualSampleQuantity(request.getIndividualSampleQuantity())
                .compositeSampleQuantity(compositeQuantity)
                .samplingLocation(request.getSamplingLocation().trim())
                .analystEmployeeCode(request.getAnalystEmployeeCode().trim())
                .samplingToolId(request.getSamplingToolId())
                .photosensitiveHandlingRequired(request.getPhotosensitiveHandlingRequired())
                .hygroscopicHandlingRequired(request.getHygroscopicHandlingRequired())
                .coaBasedRelease(resolvedMethod == SamplingMethod.COA_BASED_RELEASE)
                .rationale(request.getRationale())
                .samplingLabelApplied(false)
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        samplingPlanRepository.save(plan);
        replaceContainerSamples(plan.getId(), request.getContainerSamples(), actor);
        samplingRequest.setRequestStatus(SamplingRequestStatus.PLAN_DEFINED);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse updateSamplingPlan(UUID samplingRequestId, UUID planId, UpdateSamplingPlanRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found with id: " + planId));
        if (!plan.getSamplingRequestId().equals(samplingRequestId)) {
            throw new BusinessConflictException("Sampling plan does not belong to sampling request");
        }

        Material material = getMaterial(samplingRequest.getMaterialId());
        SamplingMethod resolvedMethod = resolveSamplingMethod(material, samplingRequest, request.getSpecId(), request.getSamplingMethod());
        int resolvedContainersToSample = calculateContainersToSample(resolvedMethod, request.getTotalContainers());
        BigDecimal compositeQuantity = calculateCompositeSampleQuantity(request.getContainerSamples(), resolvedMethod);

        validatePlanRequest(samplingRequest, request.getTotalContainers(), resolvedMethod, request.getSpecId(), request.getMoaId(), request.getSamplingToolId(), request.getContainerSamples());

        plan.setSpecId(request.getSpecId());
        plan.setMoaId(request.getMoaId());
        plan.setSamplingMethod(resolvedMethod);
        plan.setSampleType(request.getSampleType());
        plan.setTotalContainers(request.getTotalContainers());
        plan.setContainersToSample(resolvedContainersToSample);
        plan.setIndividualSampleQuantity(request.getIndividualSampleQuantity());
        plan.setCompositeSampleQuantity(compositeQuantity);
        plan.setSamplingLocation(request.getSamplingLocation().trim());
        plan.setAnalystEmployeeCode(request.getAnalystEmployeeCode().trim());
        plan.setSamplingToolId(request.getSamplingToolId());
        plan.setPhotosensitiveHandlingRequired(request.getPhotosensitiveHandlingRequired());
        plan.setHygroscopicHandlingRequired(request.getHygroscopicHandlingRequired());
        plan.setCoaBasedRelease(resolvedMethod == SamplingMethod.COA_BASED_RELEASE);
        plan.setRationale(request.getRationale());
        plan.setUpdatedBy(actor);
        plan.setUpdatedAt(LocalDateTime.now());
        samplingPlanRepository.save(plan);
        replaceContainerSamples(plan.getId(), request.getContainerSamples(), actor);

        samplingRequest.setRequestStatus(SamplingRequestStatus.PLAN_DEFINED);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse updateSamplingLabel(UUID samplingRequestId, Boolean samplingLabelApplied, String updatedBy) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        plan.setSamplingLabelApplied(Boolean.TRUE.equals(samplingLabelApplied));
        plan.setUpdatedBy(actor);
        plan.setUpdatedAt(LocalDateTime.now());
        samplingPlanRepository.save(plan);

        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse completeSampling(UUID samplingRequestId, SamplingCompletionRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        if (plan.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE) {
            throw new BusinessConflictException("Sampling completion is not required for vendor CoA based release");
        }

        if (samplingContainerSampleRepository.findBySamplingPlanIdOrderByContainerNumber(plan.getId()).isEmpty()) {
            throw new BusinessConflictException("Enter sampled quantities before completing sampling");
        }

        samplingRequest.setRequestStatus(SamplingRequestStatus.UNDER_TEST);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        updateInventoryStatus(samplingRequest, InventoryStatus.UNDER_TEST, actor);
        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse recordQcDecision(UUID samplingRequestId, QcDecisionRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        samplingRequest.setRequestStatus(Boolean.TRUE.equals(request.getApproved())
                ? SamplingRequestStatus.APPROVED
                : SamplingRequestStatus.REJECTED);
        samplingRequest.setQcDecisionRemarks(request.getRemarks().trim());
        samplingRequest.setQcDecidedBy(actor);
        samplingRequest.setQcDecidedAt(LocalDateTime.now());
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        updateInventoryStatus(
                samplingRequest,
                Boolean.TRUE.equals(request.getApproved()) ? InventoryStatus.RELEASED : InventoryStatus.REJECTED,
                actor
        );

        if (plan.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE && samplingRequest.getBatchId() != null) {
            plan.setSamplingLabelApplied(false);
            plan.setUpdatedBy(actor);
            plan.setUpdatedAt(LocalDateTime.now());
            samplingPlanRepository.save(plan);
        }

        return toResponse(samplingRequest);
    }

    private void validatePlanRequest(SamplingRequest samplingRequest,
                                     Integer totalContainers,
                                     SamplingMethod method,
                                     UUID specId,
                                     UUID moaId,
                                     UUID samplingToolId,
                                     List<SamplingContainerSampleRequest> containerSamples) {
        if (!Integer.valueOf(samplingRequest.getTotalContainers()).equals(totalContainers)) {
            throw new BusinessConflictException("Sampling plan total containers must match the GRN container count");
        }

        specRepository.findById(specId)
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + specId));
        moaRepository.findById(moaId)
                .orElseThrow(() -> new ResourceNotFoundException("MoA not found with id: " + moaId));
        samplingToolRepository.findById(samplingToolId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling tool not found with id: " + samplingToolId));

        if (method == SamplingMethod.COA_BASED_RELEASE) {
            if (containerSamples != null && !containerSamples.isEmpty()) {
                throw new BusinessConflictException("Container sample quantities are not required for vendor CoA based release");
            }
            return;
        }

        if (containerSamples == null || containerSamples.isEmpty()) {
            throw new BusinessConflictException("Container sample quantities are required");
        }

        int requiredContainers = calculateContainersToSample(method, totalContainers);
        if (containerSamples.size() != requiredContainers) {
            throw new BusinessConflictException("Selected container count must match the calculated sampling requirement");
        }

        BigDecimal commonSampleQuantity = containerSamples.get(0).getSampledQuantity().setScale(3, RoundingMode.HALF_UP);
        if (commonSampleQuantity.signum() <= 0) {
            throw new BusinessConflictException("Container sample quantity must be greater than zero");
        }

        boolean hasDifferentContainerQuantities = containerSamples.stream()
                .map(SamplingContainerSampleRequest::getSampledQuantity)
                .map(quantity -> quantity.setScale(3, RoundingMode.HALF_UP))
                .anyMatch(quantity -> quantity.compareTo(commonSampleQuantity) != 0);
        if (hasDifferentContainerQuantities) {
            throw new BusinessConflictException("The same sample quantity must be applied to every selected container");
        }
    }

    private SamplingMethod resolveSamplingMethod(Material material, SamplingRequest request, UUID specId, SamplingMethod requestedMethod) {
        if ("CRITICAL".equalsIgnoreCase(material.getMaterialType())) {
            return SamplingMethod.HUNDRED_PERCENT;
        }

        Spec spec = specRepository.findById(specId)
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + specId));
        SamplingMethod specMethod = spec.getSamplingMethod();
        if (specMethod != SamplingMethod.SQRT_N_PLUS_1 && specMethod != SamplingMethod.COA_BASED_RELEASE) {
            throw new BusinessConflictException("Non-critical materials currently support only SQRT_N_PLUS_1 or VENDOR_COA_BASED_RELEASE");
        }

        if (requestedMethod != specMethod) {
            throw new BusinessConflictException("Sampling method must match the selected spec");
        }

        return specMethod;
    }

    private int calculateContainersToSample(SamplingMethod method, Integer totalContainers) {
        return switch (method) {
            case HUNDRED_PERCENT -> totalContainers;
            case SQRT_N_PLUS_1 -> Math.min(totalContainers, (int) Math.ceil(Math.sqrt(totalContainers) + 1));
            case COA_BASED_RELEASE -> 0;
            default -> throw new BusinessConflictException("Sampling method is not supported in this MVP");
        };
    }

    private BigDecimal calculateCompositeSampleQuantity(List<SamplingContainerSampleRequest> containerSamples,
                                                        SamplingMethod method) {
        if (method == SamplingMethod.COA_BASED_RELEASE || containerSamples == null || containerSamples.isEmpty()) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }

        return containerSamples.stream()
                .map(SamplingContainerSampleRequest::getSampledQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(3, RoundingMode.HALF_UP);
    }

    private void replaceContainerSamples(UUID samplingPlanId, List<SamplingContainerSampleRequest> requests, String actor) {
        samplingContainerSampleRepository.deleteBySamplingPlanId(samplingPlanId);
        if (requests == null || requests.isEmpty()) {
            return;
        }

        List<SamplingContainerSample> samples = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (SamplingContainerSampleRequest request : requests) {
            GrnContainer container = grnContainerRepository.findById(request.getGrnContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("GRN container not found with id: " + request.getGrnContainerId()));
            samples.add(SamplingContainerSample.builder()
                    .id(UUID.randomUUID())
                    .samplingPlanId(samplingPlanId)
                    .grnContainerId(request.getGrnContainerId())
                    .containerNumber(container.getContainerNumber())
                    .sampledQuantity(request.getSampledQuantity().setScale(3, RoundingMode.HALF_UP))
                    .createdBy(actor)
                    .createdAt(now)
                    .build());
        }
        samplingContainerSampleRepository.saveAll(samples);
    }

    private void updateInventoryStatus(SamplingRequest request, InventoryStatus status, String actor) {
        if (request.getBatchId() == null) {
            return;
        }
        inventoryService.updateInventoryStatus(
                request.getMaterialId(),
                request.getBatchId(),
                request.getPalletId(),
                status,
                actor
        );
    }

    private Material getMaterial(UUID id) {
        return materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + id));
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
                .totalContainers(request.getTotalContainers())
                .qcDecisionRemarks(request.getQcDecisionRemarks())
                .qcDecidedBy(request.getQcDecidedBy())
                .qcDecidedAt(request.getQcDecidedAt())
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
                .specId(plan.getSpecId())
                .moaId(plan.getMoaId())
                .samplingMethod(plan.getSamplingMethod())
                .sampleType(plan.getSampleType())
                .totalContainers(plan.getTotalContainers())
                .containersToSample(plan.getContainersToSample())
                .individualSampleQuantity(plan.getIndividualSampleQuantity())
                .compositeSampleQuantity(plan.getCompositeSampleQuantity())
                .samplingLocation(plan.getSamplingLocation())
                .analystEmployeeCode(plan.getAnalystEmployeeCode())
                .samplingToolId(plan.getSamplingToolId())
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
                .containerSamples(samplingContainerSampleRepository.findBySamplingPlanIdOrderByContainerNumber(plan.getId())
                        .stream()
                        .map(sample -> SamplingContainerSampleResponse.builder()
                                .id(sample.getId())
                                .grnContainerId(sample.getGrnContainerId())
                                .containerNumber(sample.getContainerNumber())
                                .sampledQuantity(sample.getSampledQuantity())
                                .build())
                        .toList())
                .build();
    }
}
