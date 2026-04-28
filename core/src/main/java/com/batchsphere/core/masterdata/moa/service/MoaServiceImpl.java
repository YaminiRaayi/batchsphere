package com.batchsphere.core.masterdata.moa.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.moa.dto.MoaRequest;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.entity.MoaStatus;
import com.batchsphere.core.masterdata.moa.entity.MoaType;
import com.batchsphere.core.masterdata.moa.entity.MoaValidationStatus;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.quality.dto.RejectRequest;
import com.batchsphere.core.masterdata.quality.dto.ReviewSubmissionRequest;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MoaServiceImpl implements MoaService {

    private final MoaRepository moaRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public Moa createMoa(MoaRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (moaRepository.existsByMoaCode(request.getMoaCode().trim())) {
            throw new DuplicateResourceException("MoA code already exists: " + request.getMoaCode());
        }

        Moa moa = Moa.builder()
                .id(UUID.randomUUID())
                .moaCode(request.getMoaCode().trim())
                .moaName(request.getMoaName().trim())
                .revision(request.getRevision())
                .moaType(request.getMoaType())
                .principle(request.getPrinciple())
                .compendialRef(request.getCompendialRef())
                .instrumentType(request.getInstrumentType())
                .reagentsAndStandards(request.getReagentsAndStandards())
                .systemSuitabilityCriteria(request.getSystemSuitabilityCriteria())
                .calculationFormula(request.getCalculationFormula())
                .reportableRange(request.getReportableRange())
                .referenceAttachment(request.getReferenceAttachment())
                .validationReferenceNo(request.getValidationReferenceNo())
                .validationAttachment(request.getValidationAttachment())
                .sampleSolutionStabilityValue(request.getSampleSolutionStabilityValue())
                .sampleSolutionStabilityUnit(request.getSampleSolutionStabilityUnit())
                .sampleSolutionStabilityCondition(request.getSampleSolutionStabilityCondition())
                .validationStatus(resolveValidationStatus(request.getValidationStatus()))
                .status(MoaStatus.DRAFT)
                .reviewRoute(resolveReviewRoute(request.getReviewRoute()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        return moaRepository.save(moa);
    }

    @Override
    public Moa getMoaById(UUID id) {
        return moaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MoA not found with id: " + id));
    }

    @Override
    public List<Moa> getAllMoas() {
        return moaRepository.findByIsActiveTrueOrderByMoaCodeAsc();
    }

    @Override
    public Moa updateMoa(UUID id, MoaRequest request) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        ensureEditableDraft(moa);
        String moaCode = request.getMoaCode().trim();

        if (!moa.getMoaCode().equals(moaCode) && moaRepository.existsByMoaCode(moaCode)) {
            throw new DuplicateResourceException("MoA code already exists: " + request.getMoaCode());
        }

        moa.setMoaCode(moaCode);
        moa.setMoaName(request.getMoaName().trim());
        moa.setRevision(request.getRevision());
        moa.setMoaType(request.getMoaType());
        moa.setPrinciple(request.getPrinciple());
        moa.setCompendialRef(request.getCompendialRef());
        moa.setInstrumentType(request.getInstrumentType());
        moa.setReagentsAndStandards(request.getReagentsAndStandards());
        moa.setSystemSuitabilityCriteria(request.getSystemSuitabilityCriteria());
        moa.setCalculationFormula(request.getCalculationFormula());
        moa.setReportableRange(request.getReportableRange());
        moa.setReferenceAttachment(request.getReferenceAttachment());
        moa.setValidationReferenceNo(request.getValidationReferenceNo());
        moa.setValidationAttachment(request.getValidationAttachment());
        moa.setSampleSolutionStabilityValue(request.getSampleSolutionStabilityValue());
        moa.setSampleSolutionStabilityUnit(request.getSampleSolutionStabilityUnit());
        moa.setSampleSolutionStabilityCondition(request.getSampleSolutionStabilityCondition());
        moa.setValidationStatus(resolveValidationStatus(request.getValidationStatus()));
        moa.setReviewRoute(resolveReviewRoute(request.getReviewRoute()));
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());

        return moaRepository.save(moa);
    }

    @Override
    public Moa submitMoa(UUID id, ReviewSubmissionRequest request) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        ensureActive(moa);
        ensureStatus(moa, MoaStatus.DRAFT, "Only DRAFT MoAs can be submitted for review");
        moa.setStatus(MoaStatus.UNDER_REVIEW);
        moa.setReviewRoute(resolveReviewRoute(request != null ? request.getReviewRoute() : null));
        moa.setSubmittedBy(actor);
        moa.setSubmittedAt(LocalDateTime.now());
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());
        return moaRepository.save(moa);
    }

    @Override
    public Moa approveMoa(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        ensureActive(moa);
        ensureStatus(moa, MoaStatus.UNDER_REVIEW, "Only UNDER_REVIEW MoAs can be approved");
        if (!isApprovalEligible(moa)) {
            throw new BusinessConflictException(
                    "MoA approval requires validation status VALIDATED or VALIDATED_COMPENDIAL, except for VISUAL methods");
        }
        moa.setStatus(MoaStatus.APPROVED);
        moa.setReviewedBy(actor);
        moa.setReviewedAt(LocalDateTime.now());
        moa.setApprovedBy(actor);
        moa.setApprovedAt(LocalDateTime.now());
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());
        return moaRepository.save(moa);
    }

    @Override
    public Moa rejectMoa(UUID id, RejectRequest request) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        ensureActive(moa);
        ensureStatus(moa, MoaStatus.UNDER_REVIEW, "Only UNDER_REVIEW MoAs can be rejected");
        if (request == null || !StringUtils.hasText(request.getReviewRemarks())) {
            throw new BusinessConflictException("Review remarks are required to reject a MoA");
        }
        moa.setStatus(MoaStatus.DRAFT);
        moa.setReviewedBy(actor);
        moa.setReviewedAt(LocalDateTime.now());
        moa.setReviewRemarks(request.getReviewRemarks().trim());
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());
        return moaRepository.save(moa);
    }

    @Override
    public Moa obsoleteMoa(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        ensureActive(moa);
        ensureStatus(moa, MoaStatus.APPROVED, "Only APPROVED MoAs can be marked obsolete");
        moa.setStatus(MoaStatus.OBSOLETE);
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());
        return moaRepository.save(moa);
    }

    @Override
    public List<Moa> getReviewQueue() {
        return moaRepository.findByIsActiveTrueAndStatusOrderByMoaCodeAsc(MoaStatus.UNDER_REVIEW);
    }

    @Override
    public void deactivateMoa(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Moa moa = getMoaById(id);
        if (moa.getStatus() != MoaStatus.DRAFT) {
            throw new BusinessConflictException("Only DRAFT MoAs can be deactivated");
        }
        moa.setIsActive(false);
        moa.setUpdatedBy(actor);
        moa.setUpdatedAt(LocalDateTime.now());
        moaRepository.save(moa);
    }

    private void ensureEditableDraft(Moa moa) {
        ensureActive(moa);
        ensureStatus(moa, MoaStatus.DRAFT, "Only active DRAFT MoAs can be edited");
    }

    private void ensureStatus(Moa moa, MoaStatus expected, String message) {
        if (moa.getStatus() != expected) {
            throw new BusinessConflictException(message);
        }
    }

    private void ensureActive(Moa moa) {
        if (!Boolean.TRUE.equals(moa.getIsActive())) {
            throw new BusinessConflictException("Inactive MoAs cannot be changed");
        }
    }

    private ReviewRoute resolveReviewRoute(ReviewRoute reviewRoute) {
        return reviewRoute != null ? reviewRoute : ReviewRoute.QC_ONLY;
    }

    private MoaValidationStatus resolveValidationStatus(MoaValidationStatus validationStatus) {
        return validationStatus != null ? validationStatus : MoaValidationStatus.NOT_VALIDATED;
    }

    private boolean isApprovalEligible(Moa moa) {
        if (moa.getMoaType() == MoaType.VISUAL) {
            return true;
        }
        return moa.getValidationStatus() == MoaValidationStatus.VALIDATED
                || moa.getValidationStatus() == MoaValidationStatus.VALIDATED_COMPENDIAL;
    }
}
