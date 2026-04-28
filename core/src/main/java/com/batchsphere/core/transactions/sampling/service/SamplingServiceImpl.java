package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.samplingtool.repository.SamplingToolRepository;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.repository.MaterialSpecLinkRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import com.batchsphere.core.transactions.grn.entity.GrnContainer;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.repository.GrnContainerRepository;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.entity.InventoryReferenceType;
import com.batchsphere.core.transactions.inventory.service.InventoryService;
import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.QcReceiptRequest;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.QcTestResultResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingHandoffRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingPlanResponse;
import com.batchsphere.core.transactions.sampling.dto.QcDispositionResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SampleContainerLinkResponse;
import com.batchsphere.core.transactions.sampling.dto.SampleResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingStartRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingSummaryResponse;
import com.batchsphere.core.transactions.sampling.dto.StartQcReviewRequest;
import com.batchsphere.core.transactions.sampling.dto.UpdateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.entity.Sample;
import com.batchsphere.core.transactions.sampling.entity.SampleContainerLink;
import com.batchsphere.core.transactions.sampling.entity.SampleStatus;
import com.batchsphere.core.transactions.sampling.entity.QcDisposition;
import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import com.batchsphere.core.transactions.sampling.entity.SamplingContainerSample;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import com.batchsphere.core.transactions.sampling.entity.SamplingPlan;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import com.batchsphere.core.transactions.sampling.repository.SampleContainerLinkRepository;
import com.batchsphere.core.transactions.sampling.repository.SampleRepository;
import com.batchsphere.core.transactions.sampling.repository.QcDispositionRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SamplingServiceImpl implements SamplingService {

    private final SamplingRequestRepository samplingRequestRepository;
    private final SamplingPlanRepository samplingPlanRepository;
    private final SamplingContainerSampleRepository samplingContainerSampleRepository;
    private final MaterialRepository materialRepository;
    private final SpecRepository specRepository;
    private final MaterialSpecLinkRepository materialSpecLinkRepository;
    private final MoaRepository moaRepository;
    private final SamplingToolRepository samplingToolRepository;
    private final GrnContainerRepository grnContainerRepository;
    private final InventoryService inventoryService;
    private final AuthenticatedActorService authenticatedActorService;
    private final SampleRepository sampleRepository;
    private final SampleContainerLinkRepository sampleContainerLinkRepository;
    private final QcDispositionRepository qcDispositionRepository;
    private final QcWorksheetService qcWorksheetService;
    private final QcTestResultService qcTestResultService;

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
                inventoryService.transitionInventoryStatus(
                        item.getMaterialId(),
                        item.getBatchId(),
                        item.getPalletId(),
                        InventoryStatus.QUARANTINE,
                        actor
                        ,
                        InventoryReferenceType.SAMPLING_REQUEST,
                        samplingRequest.getId(),
                        "Sampling request auto-created from GRN receipt"
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
    public SamplingSummaryResponse getSamplingSummary() {
        Map<SamplingRequestStatus, Long> counts = new LinkedHashMap<>();
        for (SamplingRequestStatus status : SamplingRequestStatus.values()) {
            counts.put(status, 0L);
        }
        for (Object[] row : samplingRequestRepository.countActiveByStatus()) {
            counts.put((SamplingRequestStatus) row[0], (Long) row[1]);
        }
        return SamplingSummaryResponse.builder()
                .countsByStatus(counts)
                .build();
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
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.REQUESTED) {
            throw new BusinessConflictException("Sampling plan can only be created for requested sampling workflows");
        }
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
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.PLAN_DEFINED) {
            throw new BusinessConflictException("Sampling plan can only be updated before sampling is completed");
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
    public SamplingRequestResponse startSampling(UUID samplingRequestId, SamplingStartRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        if (plan.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE) {
            throw new BusinessConflictException("Sampling start is not required for vendor CoA based release");
        }
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.PLAN_DEFINED) {
            throw new BusinessConflictException("Sampling can only be started after the plan is defined");
        }

        samplingRequest.setRequestStatus(SamplingRequestStatus.IN_PROGRESS);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        updateInventoryStatus(
                samplingRequest,
                InventoryStatus.SAMPLING,
                actor,
                "Sampling started physically in warehouse"
        );
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
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.IN_PROGRESS) {
            throw new BusinessConflictException("Sampling can only be completed after sampling has started");
        }

        List<SamplingContainerSample> containerSamples = samplingContainerSampleRepository.findBySamplingPlanIdOrderByContainerNumber(plan.getId());
        if (containerSamples.isEmpty()) {
            throw new BusinessConflictException("Enter sampled quantities before completing sampling");
        }

        reconcileContainerSamples(plan, containerSamples, actor);
        createOrRefreshSample(samplingRequest, plan, containerSamples, actor);
        samplingRequest.setRequestStatus(SamplingRequestStatus.SAMPLED);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse handoffToQc(UUID samplingRequestId, SamplingHandoffRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        if (plan.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE) {
            throw new BusinessConflictException("QC handoff is not required for vendor CoA based release");
        }
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.SAMPLED) {
            throw new BusinessConflictException("QC handoff can only happen after sampling is completed");
        }

        samplingRequest.setRequestStatus(SamplingRequestStatus.HANDED_TO_QC);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);
        updateSampleOnHandoff(samplingRequestId, actor);
        createOrUpdateQcDispositionOnHandoff(samplingRequestId, actor);

        updateInventoryStatus(
                samplingRequest,
                InventoryStatus.UNDER_TEST,
                actor,
                "Sample handed over for QC testing"
        );
        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse receiveInQc(UUID samplingRequestId, QcReceiptRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.HANDED_TO_QC) {
            throw new BusinessConflictException("QC receipt can only happen after sample handoff to QC");
        }
        if (plan.getSpecId() == null) {
            throw new BusinessConflictException("QC receipt requires a resolved specification on the sampling plan");
        }
        Sample sample = sampleRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("QC sample not found for request: " + samplingRequestId));
        LocalDateTime receiptTime = request.getReceiptTimestamp() != null ? request.getReceiptTimestamp() : LocalDateTime.now();

        samplingRequest.setRequestStatus(SamplingRequestStatus.RECEIVED);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        sample.setSampleStatus(SampleStatus.RECEIVED);
        sample.setReceivedByQc(request.getReceivedBy().trim());
        sample.setReceivedAtQc(receiptTime);
        sample.setReceiptCondition(request.getReceiptCondition().trim());
        sample.setQcStorageLocation(request.getSampleStorageLocation().trim());
        sample.setUpdatedBy(actor);
        sample.setUpdatedAt(LocalDateTime.now());
        sampleRepository.save(sample);

        updateQcDispositionStatus(samplingRequestId, QcDispositionStatus.RECEIVED, actor);
        qcWorksheetService.generateWorksheet(sample.getId(), plan.getSpecId(), resolveWorksheetAnalystCode(plan, actor), actor);
        return toResponse(samplingRequest);
    }

    @Override
    @Transactional
    public SamplingRequestResponse startQcReview(UUID samplingRequestId, StartQcReviewRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        if (samplingRequest.getRequestStatus() != SamplingRequestStatus.RECEIVED) {
            throw new BusinessConflictException("QC review can only start after QC receipt");
        }
        Sample sample = sampleRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("QC sample not found for request: " + samplingRequestId));
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        samplingRequest.setRequestStatus(SamplingRequestStatus.UNDER_REVIEW);
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);

        sample.setSampleStatus(SampleStatus.UNDER_REVIEW);
        sample.setUpdatedBy(actor);
        sample.setUpdatedAt(LocalDateTime.now());
        sampleRepository.save(sample);

        plan.setAnalystEmployeeCode(request.getAnalystCode().trim());
        plan.setUpdatedBy(actor);
        plan.setUpdatedAt(LocalDateTime.now());
        samplingPlanRepository.save(plan);

        updateQcDispositionStatus(samplingRequestId, QcDispositionStatus.UNDER_REVIEW, actor);
        return toResponse(samplingRequest);
    }

    @Override
    public List<QcTestResultResponse> getWorksheet(UUID samplingRequestId) {
        Sample sample = sampleRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("QC sample not found for request: " + samplingRequestId));
        return qcWorksheetService.getWorksheet(sample.getId());
    }

    @Override
    @Transactional
    public QcTestResultResponse recordWorksheetResult(UUID samplingRequestId, UUID testResultId, RecordQcTestResultRequest request) {
        sampleRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("QC sample not found for request: " + samplingRequestId));
        String actor = authenticatedActorService.currentActor();
        return qcTestResultService.recordResult(testResultId, request, actor);
    }

    @Override
    @Transactional
    public SamplingRequestResponse recordQcDecision(UUID samplingRequestId, QcDecisionRequest request) {
        String actor = authenticatedActorService.currentActor();
        SamplingRequest samplingRequest = getSamplingRequest(samplingRequestId);
        SamplingPlan plan = samplingPlanRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sampling plan not found for request: " + samplingRequestId));

        if (samplingRequest.getRequestStatus() == SamplingRequestStatus.COMPLETED
                || samplingRequest.getRequestStatus() == SamplingRequestStatus.APPROVED
                || samplingRequest.getRequestStatus() == SamplingRequestStatus.REJECTED) {
            throw new BusinessConflictException("QC decision has already been recorded for this sampling request");
        }

        if (plan.getSamplingMethod() == SamplingMethod.COA_BASED_RELEASE) {
            if (samplingRequest.getRequestStatus() != SamplingRequestStatus.PLAN_DEFINED) {
                throw new BusinessConflictException("CoA-based release can only be decided after the sampling plan is defined");
            }
        } else if (samplingRequest.getRequestStatus() != SamplingRequestStatus.UNDER_REVIEW) {
            throw new BusinessConflictException("QC decision can only be recorded after QC review has started");
        }

        if (plan.getSamplingMethod() != SamplingMethod.COA_BASED_RELEASE) {
            Sample sample = sampleRepository.findBySamplingRequestId(samplingRequestId)
                    .orElseThrow(() -> new ResourceNotFoundException("QC sample not found for request: " + samplingRequestId));
            if (Boolean.TRUE.equals(request.getApproved())) {
                if (!qcWorksheetService.isWorksheetComplete(sample.getId())) {
                    throw new BusinessConflictException("QC approval requires all mandatory worksheet results to pass");
                }
            } else if (!qcWorksheetService.hasFailingResults(sample.getId())) {
                throw new BusinessConflictException("QC rejection requires at least one failing worksheet result");
            }
        }

        samplingRequest.setRequestStatus(SamplingRequestStatus.COMPLETED);
        samplingRequest.setQcDecisionRemarks(request.getRemarks().trim());
        samplingRequest.setQcDecidedBy(actor);
        samplingRequest.setQcDecidedAt(LocalDateTime.now());
        samplingRequest.setUpdatedBy(actor);
        samplingRequest.setUpdatedAt(LocalDateTime.now());
        samplingRequestRepository.save(samplingRequest);
        updateSampleOnQcDecision(samplingRequest.getId(), Boolean.TRUE.equals(request.getApproved()), actor);
        updateQcDispositionOnDecision(samplingRequest.getId(), request.getRemarks().trim(), Boolean.TRUE.equals(request.getApproved()), actor);

        updateInventoryStatus(
                samplingRequest,
                Boolean.TRUE.equals(request.getApproved()) ? InventoryStatus.RELEASED : InventoryStatus.REJECTED,
                actor,
                Boolean.TRUE.equals(request.getApproved())
                        ? "QC decision recorded: approved"
                        : "QC decision recorded: rejected"
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
            if (!Boolean.TRUE.equals(samplingRequest.getVendorCoaReleaseAllowed())) {
                throw new BusinessConflictException("Vendor CoA based release is not allowed for this sampling request");
            }
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
        validateContainerSamplesBelongToSamplingRequest(samplingRequest, containerSamples);

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
        MaterialSpecLink activeLink = materialSpecLinkRepository.findByMaterialIdAndIsActiveTrue(material.getId()).orElse(null);
        UUID activeSpecId = activeLink != null ? activeLink.getSpecId() : material.getSpecId();
        if (activeSpecId == null) {
            throw new BusinessConflictException("No active specification is linked to the material master for this sampling request");
        }
        if (!activeSpecId.equals(specId)) {
            throw new BusinessConflictException("Sampling must use the active specification linked to the material master");
        }

        if ("CRITICAL".equalsIgnoreCase(material.getMaterialType())) {
            return SamplingMethod.HUNDRED_PERCENT;
        }

        Spec spec = specRepository.findById(specId)
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + specId));
        if (!Boolean.TRUE.equals(spec.getIsActive()) || spec.getStatus() != SpecStatus.APPROVED) {
            throw new BusinessConflictException("Sampling must use an active APPROVED spec");
        }
        SamplingMethod specMethod = spec.getSamplingMethod();
        if (specMethod != SamplingMethod.SQRT_N_PLUS_1 && specMethod != SamplingMethod.COA_BASED_RELEASE) {
            throw new BusinessConflictException("Non-critical materials currently support only SQRT_N_PLUS_1 or VENDOR_COA_BASED_RELEASE");
        }

        if (requestedMethod != specMethod) {
            throw new BusinessConflictException("Sampling method must match the selected spec");
        }

        return specMethod;
    }

    private void reconcileContainerSamples(SamplingPlan plan,
                                           List<SamplingContainerSample> samples,
                                           String actor) {
        LocalDateTime now = LocalDateTime.now();
        for (SamplingContainerSample sample : samples) {
            GrnContainer container = grnContainerRepository.findById(sample.getGrnContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("GRN container not found with id: " + sample.getGrnContainerId()));
            if (!Boolean.TRUE.equals(container.getIsActive())) {
                throw new ResourceNotFoundException("GRN container not found with id: " + sample.getGrnContainerId());
            }
            if (sample.getSampledQuantity().compareTo(container.getQuantity()) > 0) {
                throw new BusinessConflictException("Sampled quantity cannot exceed available container quantity");
            }

            container.setQuantity(container.getQuantity().subtract(sample.getSampledQuantity()).setScale(3, RoundingMode.HALF_UP));
            container.setSampled(true);
            container.setSampledQuantity(sample.getSampledQuantity().setScale(3, RoundingMode.HALF_UP));
            container.setSamplingLocation(plan.getSamplingLocation());
            container.setSampledBy(actor);
            container.setSampledAt(now);
            container.setInventoryStatus(InventoryStatus.UNDER_TEST);
            container.setUpdatedBy(actor);
            container.setUpdatedAt(now);
            grnContainerRepository.save(container);
        }
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

    private void validateContainerSamplesBelongToSamplingRequest(SamplingRequest samplingRequest,
                                                                 List<SamplingContainerSampleRequest> containerSamples) {
        List<UUID> seenContainerIds = new ArrayList<>();
        for (SamplingContainerSampleRequest containerSample : containerSamples) {
            if (seenContainerIds.contains(containerSample.getGrnContainerId())) {
                throw new BusinessConflictException("Container sample selections must not contain duplicates");
            }
            seenContainerIds.add(containerSample.getGrnContainerId());

            GrnContainer container = grnContainerRepository.findById(containerSample.getGrnContainerId())
                    .orElseThrow(() -> new ResourceNotFoundException("GRN container not found with id: " + containerSample.getGrnContainerId()));
            if (!Boolean.TRUE.equals(container.getIsActive())) {
                throw new ResourceNotFoundException("GRN container not found with id: " + containerSample.getGrnContainerId());
            }
            if (!container.getGrnItemId().equals(samplingRequest.getGrnItemId())) {
                throw new BusinessConflictException("Selected containers must belong to the current sampling request");
            }
        }
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

    private void updateInventoryStatus(SamplingRequest request,
                                       InventoryStatus status,
                                       String actor,
                                       String remarks) {
        if (request.getBatchId() == null) {
            return;
        }
        inventoryService.transitionInventoryStatus(
                request.getMaterialId(),
                request.getBatchId(),
                request.getPalletId(),
                status,
                actor,
                InventoryReferenceType.SAMPLING_REQUEST,
                request.getId(),
                remarks
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
                .sample(sampleRepository.findBySamplingRequestId(request.getId()).map(this::toSampleResponse).orElse(null))
                .qcDisposition(qcDispositionRepository.findBySamplingRequestId(request.getId()).map(this::toQcDispositionResponse).orElse(null))
                .build();
    }

    private void createOrRefreshSample(SamplingRequest request,
                                       SamplingPlan plan,
                                       List<SamplingContainerSample> containerSamples,
                                       String actor) {
        LocalDateTime now = LocalDateTime.now();
        Sample sample = sampleRepository.findBySamplingRequestId(request.getId())
                .orElseGet(() -> Sample.builder()
                        .id(UUID.randomUUID())
                        .sampleNumber(generateSampleNumber())
                        .samplingRequestId(request.getId())
                        .createdBy(actor)
                        .createdAt(now)
                        .isActive(true)
                        .build());

        sample.setBatchId(request.getBatchId());
        sample.setMaterialId(request.getMaterialId());
        sample.setSampleType(plan.getSampleType());
        sample.setSampleStatus(SampleStatus.COLLECTED);
        sample.setSampleQuantity(containerSamples.stream()
                .map(SamplingContainerSample::getSampledQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(3, RoundingMode.HALF_UP));
        sample.setUom(resolveSampleUom(containerSamples));
        sample.setCollectedBy(actor);
        sample.setCollectedAt(now);
        sample.setSamplingLocation(plan.getSamplingLocation());
        sample.setRemarks("Sample collected from selected GRN containers");
        sample.setUpdatedBy(actor);
        sample.setUpdatedAt(now);

        Sample savedSample = sampleRepository.save(sample);
        sampleContainerLinkRepository.deleteBySampleId(savedSample.getId());
        sampleContainerLinkRepository.saveAll(containerSamples.stream()
                .map(containerSample -> SampleContainerLink.builder()
                        .id(UUID.randomUUID())
                        .sampleId(savedSample.getId())
                        .grnContainerId(containerSample.getGrnContainerId())
                        .containerNumber(containerSample.getContainerNumber())
                        .sampledQuantity(containerSample.getSampledQuantity())
                        .createdBy(actor)
                        .createdAt(now)
                        .build())
                .toList());
    }

    private void updateSampleOnHandoff(UUID samplingRequestId, String actor) {
        Sample sample = sampleRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Sample not found for sampling request: " + samplingRequestId));
        sample.setSampleStatus(SampleStatus.HANDED_TO_QC);
        sample.setHandoffToQcBy(actor);
        sample.setHandoffToQcAt(LocalDateTime.now());
        sample.setUpdatedBy(actor);
        sample.setUpdatedAt(LocalDateTime.now());
        sampleRepository.save(sample);
    }

    private void updateSampleOnQcDecision(UUID samplingRequestId, boolean approved, String actor) {
        sampleRepository.findBySamplingRequestId(samplingRequestId).ifPresent(sample -> {
            sample.setSampleStatus(approved ? SampleStatus.APPROVED : SampleStatus.REJECTED);
            sample.setUpdatedBy(actor);
            sample.setUpdatedAt(LocalDateTime.now());
            sampleRepository.save(sample);
        });
    }

    private void createOrUpdateQcDispositionOnHandoff(UUID samplingRequestId, String actor) {
        LocalDateTime now = LocalDateTime.now();
        UUID sampleId = sampleRepository.findBySamplingRequestId(samplingRequestId).map(Sample::getId).orElse(null);
        QcDisposition disposition = qcDispositionRepository.findBySamplingRequestId(samplingRequestId)
                .orElseGet(() -> QcDisposition.builder()
                        .id(UUID.randomUUID())
                        .samplingRequestId(samplingRequestId)
                        .createdBy(actor)
                        .createdAt(now)
                        .isActive(true)
                        .build());
        disposition.setSampleId(sampleId);
        disposition.setStatus(QcDispositionStatus.PENDING);
        disposition.setUpdatedBy(actor);
        disposition.setUpdatedAt(now);
        qcDispositionRepository.save(disposition);
    }

    private void updateQcDispositionStatus(UUID samplingRequestId, QcDispositionStatus status, String actor) {
        QcDisposition disposition = qcDispositionRepository.findBySamplingRequestId(samplingRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("QC disposition not found for request: " + samplingRequestId));
        disposition.setStatus(status);
        disposition.setUpdatedBy(actor);
        disposition.setUpdatedAt(LocalDateTime.now());
        qcDispositionRepository.save(disposition);
    }

    private void updateQcDispositionOnDecision(UUID samplingRequestId,
                                               String remarks,
                                               boolean approved,
                                               String actor) {
        LocalDateTime now = LocalDateTime.now();
        QcDisposition disposition = qcDispositionRepository.findBySamplingRequestId(samplingRequestId)
                .orElseGet(() -> QcDisposition.builder()
                        .id(UUID.randomUUID())
                        .samplingRequestId(samplingRequestId)
                        .createdBy(actor)
                        .createdAt(now)
                        .isActive(true)
                        .build());
        disposition.setSampleId(sampleRepository.findBySamplingRequestId(samplingRequestId).map(Sample::getId).orElse(null));
        disposition.setStatus(approved ? QcDispositionStatus.APPROVED : QcDispositionStatus.REJECTED);
        disposition.setDecisionRemarks(remarks);
        disposition.setDecisionBy(actor);
        disposition.setDecisionAt(now);
        disposition.setUpdatedBy(actor);
        disposition.setUpdatedAt(now);
        qcDispositionRepository.save(disposition);
    }

    private String resolveWorksheetAnalystCode(SamplingPlan plan, String actor) {
        return plan.getAnalystEmployeeCode() != null && !plan.getAnalystEmployeeCode().isBlank()
                ? plan.getAnalystEmployeeCode().trim()
                : actor;
    }

    private String resolveSampleUom(List<SamplingContainerSample> containerSamples) {
        if (containerSamples.isEmpty()) {
            return "EA";
        }
        UUID containerId = containerSamples.get(0).getGrnContainerId();
        GrnContainer container = grnContainerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException("GRN container not found with id: " + containerId));
        return container.getUom();
    }

    private String generateSampleNumber() {
        return "SMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
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

    private SampleResponse toSampleResponse(Sample sample) {
        return SampleResponse.builder()
                .id(sample.getId())
                .sampleNumber(sample.getSampleNumber())
                .samplingRequestId(sample.getSamplingRequestId())
                .batchId(sample.getBatchId())
                .materialId(sample.getMaterialId())
                .sampleType(sample.getSampleType())
                .sampleStatus(sample.getSampleStatus())
                .sampleQuantity(sample.getSampleQuantity())
                .uom(sample.getUom())
                .collectedBy(sample.getCollectedBy())
                .collectedAt(sample.getCollectedAt())
                .samplingLocation(sample.getSamplingLocation())
                .handoffToQcBy(sample.getHandoffToQcBy())
                .handoffToQcAt(sample.getHandoffToQcAt())
                .receivedByQc(sample.getReceivedByQc())
                .receivedAtQc(sample.getReceivedAtQc())
                .receiptCondition(sample.getReceiptCondition())
                .qcStorageLocation(sample.getQcStorageLocation())
                .remarks(sample.getRemarks())
                .isActive(sample.getIsActive())
                .createdBy(sample.getCreatedBy())
                .createdAt(sample.getCreatedAt())
                .updatedBy(sample.getUpdatedBy())
                .updatedAt(sample.getUpdatedAt())
                .containerLinks(sampleContainerLinkRepository.findBySampleIdOrderByContainerNumber(sample.getId())
                        .stream()
                        .map(link -> SampleContainerLinkResponse.builder()
                                .id(link.getId())
                                .grnContainerId(link.getGrnContainerId())
                                .containerNumber(link.getContainerNumber())
                                .sampledQuantity(link.getSampledQuantity())
                                .build())
                        .toList())
                .build();
    }

    private QcDispositionResponse toQcDispositionResponse(QcDisposition disposition) {
        return QcDispositionResponse.builder()
                .id(disposition.getId())
                .sampleId(disposition.getSampleId())
                .samplingRequestId(disposition.getSamplingRequestId())
                .status(disposition.getStatus())
                .decisionRemarks(disposition.getDecisionRemarks())
                .decisionBy(disposition.getDecisionBy())
                .decisionAt(disposition.getDecisionAt())
                .isActive(disposition.getIsActive())
                .createdBy(disposition.getCreatedBy())
                .createdAt(disposition.getCreatedAt())
                .updatedBy(disposition.getUpdatedBy())
                .updatedAt(disposition.getUpdatedAt())
                .build();
    }
}
