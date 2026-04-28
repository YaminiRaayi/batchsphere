package com.batchsphere.core.masterdata.spec.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.entity.MoaStatus;
import com.batchsphere.core.masterdata.moa.entity.MoaType;
import com.batchsphere.core.masterdata.moa.entity.MoaValidationStatus;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.quality.dto.RejectRequest;
import com.batchsphere.core.masterdata.quality.dto.ReviewSubmissionRequest;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.repository.MaterialSpecLinkRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SpecServiceImpl implements SpecService {

    private final SpecRepository specRepository;
    private final SpecParameterRepository specParameterRepository;
    private final MoaRepository moaRepository;
    private final MaterialRepository materialRepository;
    private final MaterialSpecLinkRepository materialSpecLinkRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public Spec createSpec(SpecRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (specRepository.existsBySpecCodeAndRevision(request.getSpecCode().trim(), safeRevision(request.getRevision()))) {
            throw new DuplicateResourceException("Spec code already exists: " + request.getSpecCode());
        }

        Spec spec = Spec.builder()
                .id(UUID.randomUUID())
                .specCode(request.getSpecCode().trim())
                .specName(request.getSpecName().trim())
                .revision(safeRevision(request.getRevision()))
                .specType(request.getSpecType())
                .status(SpecStatus.DRAFT)
                .samplingMethod(request.getSamplingMethod())
                .targetMarket(request.getTargetMarket())
                .effectiveDate(request.getEffectiveDate())
                .expiryDate(request.getExpiryDate())
                .compendialRef(request.getCompendialRef())
                .compendialEdition(request.getCompendialEdition())
                .referenceDocumentNo(request.getReferenceDocumentNo())
                .referenceAttachment(request.getReferenceAttachment())
                .reviewRoute(resolveReviewRoute(request.getReviewRoute()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();

        validateDates(spec);
        Spec savedSpec = specRepository.save(spec);
        syncDraftMaterialSelections(savedSpec, request.getMaterialIds(), actor);
        return savedSpec;
    }

    @Override
    public Spec getSpecById(UUID id) {
        return specRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + id));
    }

    @Override
    public List<Spec> getAllSpecs() {
        return specRepository.findByIsActiveTrueOrderBySpecCodeAsc();
    }

    @Override
    public Spec updateSpec(UUID id, SpecRequest request) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getSpecById(id);
        ensureEditableDraft(spec);
        String specCode = request.getSpecCode().trim();

        if ((!spec.getSpecCode().equals(specCode) || !safeRevision(spec.getRevision()).equals(safeRevision(request.getRevision())))
                && specRepository.existsBySpecCodeAndRevision(specCode, safeRevision(request.getRevision()))) {
            throw new DuplicateResourceException("Spec code already exists: " + request.getSpecCode());
        }

        spec.setSpecCode(specCode);
        spec.setSpecName(request.getSpecName().trim());
        spec.setRevision(safeRevision(request.getRevision()));
        spec.setSpecType(request.getSpecType());
        spec.setSamplingMethod(request.getSamplingMethod());
        spec.setTargetMarket(request.getTargetMarket());
        spec.setEffectiveDate(request.getEffectiveDate());
        spec.setExpiryDate(request.getExpiryDate());
        spec.setCompendialRef(request.getCompendialRef());
        spec.setCompendialEdition(request.getCompendialEdition());
        spec.setReferenceDocumentNo(request.getReferenceDocumentNo());
        spec.setReferenceAttachment(request.getReferenceAttachment());
        spec.setReviewRoute(resolveReviewRoute(request.getReviewRoute()));
        spec.setUpdatedBy(actor);
        spec.setUpdatedAt(LocalDateTime.now());

        validateDates(spec);
        Spec savedSpec = specRepository.save(spec);
        syncDraftMaterialSelections(savedSpec, request.getMaterialIds(), actor);
        return savedSpec;
    }

    @Override
    public Spec submitSpec(UUID id, ReviewSubmissionRequest request) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getSpecById(id);
        ensureActive(spec);
        ensureStatus(spec, SpecStatus.DRAFT, "Only DRAFT specs can be submitted for review");
        spec.setStatus(SpecStatus.UNDER_REVIEW);
        spec.setReviewRoute(resolveReviewRoute(request != null ? request.getReviewRoute() : null));
        spec.setSubmittedBy(actor);
        spec.setSubmittedAt(LocalDateTime.now());
        spec.setUpdatedBy(actor);
        spec.setUpdatedAt(LocalDateTime.now());
        return specRepository.save(spec);
    }

    @Override
    public Spec approveSpec(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getSpecById(id);
        ensureActive(spec);
        ensureStatus(spec, SpecStatus.UNDER_REVIEW, "Only UNDER_REVIEW specs can be approved");
        validateApprovedSpecMoaRules(spec.getId());
        spec.setStatus(SpecStatus.APPROVED);
        spec.setReviewedBy(actor);
        spec.setReviewedAt(LocalDateTime.now());
        spec.setApprovedBy(actor);
        spec.setApprovedAt(LocalDateTime.now());
        spec.setUpdatedBy(actor);
        spec.setUpdatedAt(LocalDateTime.now());
        Spec savedSpec = specRepository.save(spec);
        autoObsoletePreviousRevision(savedSpec, actor);
        activateMaterialLinks(savedSpec, actor);
        return savedSpec;
    }

    @Override
    public Spec rejectSpec(UUID id, RejectRequest request) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getSpecById(id);
        ensureActive(spec);
        ensureStatus(spec, SpecStatus.UNDER_REVIEW, "Only UNDER_REVIEW specs can be rejected");
        if (request == null || !StringUtils.hasText(request.getReviewRemarks())) {
            throw new BusinessConflictException("Review remarks are required to reject a spec");
        }
        spec.setStatus(SpecStatus.DRAFT);
        spec.setReviewedBy(actor);
        spec.setReviewedAt(LocalDateTime.now());
        spec.setReviewRemarks(request.getReviewRemarks().trim());
        spec.setUpdatedBy(actor);
        spec.setUpdatedAt(LocalDateTime.now());
        return specRepository.save(spec);
    }

    @Override
    public Spec reviseSpec(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Spec current = getSpecById(id);
        ensureActive(current);
        ensureStatus(current, SpecStatus.APPROVED, "Only APPROVED specs can create a new revision");
        if (specRepository.existsByPreviousSpecIdAndIsActiveTrueAndStatusIn(
                current.getId(), List.of(SpecStatus.DRAFT, SpecStatus.UNDER_REVIEW))) {
            throw new BusinessConflictException("An open revision already exists for this specification");
        }

        String nextRevision = nextRevisionValue(current.getRevision());
        if (specRepository.existsBySpecCodeAndRevision(current.getSpecCode(), nextRevision)) {
            throw new BusinessConflictException("Next revision already exists for this specification: " + nextRevision);
        }

        LocalDateTime now = LocalDateTime.now();
        Spec revised = Spec.builder()
                .id(UUID.randomUUID())
                .specCode(current.getSpecCode())
                .specName(current.getSpecName())
                .revision(nextRevision)
                .specType(current.getSpecType())
                .status(SpecStatus.DRAFT)
                .samplingMethod(current.getSamplingMethod())
                .targetMarket(current.getTargetMarket())
                .effectiveDate(current.getEffectiveDate())
                .expiryDate(current.getExpiryDate())
                .compendialRef(current.getCompendialRef())
                .compendialEdition(current.getCompendialEdition())
                .referenceDocumentNo(current.getReferenceDocumentNo())
                .referenceAttachment(current.getReferenceAttachment())
                .reviewRoute(current.getReviewRoute())
                .previousSpecId(current.getId())
                .isActive(true)
                .createdBy(actor)
                .createdAt(now)
                .build();
        validateDates(revised);
        Spec savedRevision = specRepository.save(revised);
        cloneParameters(current.getId(), savedRevision.getId(), actor, now);
        cloneMaterialSelections(current.getId(), savedRevision.getId(), actor, now);
        return savedRevision;
    }

    @Override
    public Spec obsoleteSpec(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getSpecById(id);
        ensureActive(spec);
        ensureStatus(spec, SpecStatus.APPROVED, "Only APPROVED specs can be marked obsolete");
        spec.setStatus(SpecStatus.OBSOLETE);
        spec.setUpdatedBy(actor);
        spec.setUpdatedAt(LocalDateTime.now());
        return specRepository.save(spec);
    }

    @Override
    public List<Spec> getReviewQueue() {
        return specRepository.findByIsActiveTrueAndStatusOrderBySpecCodeAsc(SpecStatus.UNDER_REVIEW);
    }

    @Override
    public List<MaterialSpecLink> getMaterialLinks(UUID id) {
        getSpecById(id);
        return materialSpecLinkRepository.findBySpecIdAndDelinkedAtIsNullOrderByCreatedAtAsc(id);
    }

    public void deactivateSpec(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Spec spec = getSpecById(id);
        if (spec.getStatus() != SpecStatus.DRAFT) {
            throw new BusinessConflictException("Only DRAFT specs can be deactivated");
        }
        spec.setIsActive(false);
        spec.setUpdatedBy(actor);
        spec.setUpdatedAt(LocalDateTime.now());
        specRepository.save(spec);
    }

    private void ensureEditableDraft(Spec spec) {
        ensureActive(spec);
        ensureStatus(spec, SpecStatus.DRAFT, "Only active DRAFT specs can be edited");
    }

    private void ensureStatus(Spec spec, SpecStatus expected, String message) {
        if (spec.getStatus() != expected) {
            throw new BusinessConflictException(message);
        }
    }

    private void ensureActive(Spec spec) {
        if (!Boolean.TRUE.equals(spec.getIsActive())) {
            throw new BusinessConflictException("Inactive specs cannot be changed");
        }
    }

    private ReviewRoute resolveReviewRoute(ReviewRoute reviewRoute) {
        return reviewRoute != null ? reviewRoute : ReviewRoute.QC_ONLY;
    }

    private void validateApprovedSpecMoaRules(UUID specId) {
        List<SpecParameter> parameters = specParameterRepository.findBySpecIdAndIsActiveTrueOrderBySequenceAsc(specId);
        for (SpecParameter parameter : parameters) {
            if (parameter.getMoaId() == null) {
                continue;
            }
            Moa moa = moaRepository.findById(parameter.getMoaId())
                    .orElseThrow(() -> new BusinessConflictException("Spec parameter references missing MoA: " + parameter.getMoaId()));
            if (!Boolean.TRUE.equals(moa.getIsActive()) || moa.getStatus() != MoaStatus.APPROVED) {
                throw new BusinessConflictException("Spec approval requires all linked MoAs to be active and APPROVED");
            }
            boolean valid = moa.getMoaType() == MoaType.VISUAL
                    || moa.getValidationStatus() == MoaValidationStatus.VALIDATED
                    || moa.getValidationStatus() == MoaValidationStatus.VALIDATED_COMPENDIAL;
            if (!valid) {
                throw new BusinessConflictException("Spec approval requires linked MoAs to be VALIDATED or VALIDATED_COMPENDIAL");
            }
        }
    }

    private void validateDates(Spec spec) {
        if (spec.getEffectiveDate() != null && spec.getExpiryDate() != null
                && spec.getExpiryDate().isBefore(spec.getEffectiveDate())) {
            throw new BusinessConflictException("Expiry date cannot be before effective date");
        }
    }

    private void autoObsoletePreviousRevision(Spec approvedRevision, String actor) {
        if (approvedRevision.getPreviousSpecId() == null) {
            return;
        }
        Spec previous = getSpecById(approvedRevision.getPreviousSpecId());
        if (previous.getStatus() == SpecStatus.APPROVED) {
            previous.setStatus(SpecStatus.OBSOLETE);
            previous.setUpdatedBy(actor);
            previous.setUpdatedAt(LocalDateTime.now());
            specRepository.save(previous);
        }
    }

    private void syncDraftMaterialSelections(Spec spec, List<UUID> materialIds, String actor) {
        Set<UUID> requestedMaterialIds = materialIds == null ? Set.of() : new HashSet<>(materialIds);
        List<MaterialSpecLink> currentLinks = materialSpecLinkRepository.findBySpecIdAndDelinkedAtIsNullOrderByCreatedAtAsc(spec.getId());
        LocalDateTime now = LocalDateTime.now();

        for (MaterialSpecLink link : currentLinks) {
            if (!requestedMaterialIds.contains(link.getMaterialId())) {
                link.setDelinkedBy(actor);
                link.setDelinkedAt(now);
                link.setIsActive(false);
                materialSpecLinkRepository.save(link);
            }
        }

        for (UUID materialId : requestedMaterialIds) {
            Material material = materialRepository.findById(materialId)
                    .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + materialId));

            boolean alreadyLinked = currentLinks.stream()
                    .anyMatch(link -> link.getMaterialId().equals(materialId) && link.getDelinkedAt() == null);
            if (alreadyLinked) {
                continue;
            }

            MaterialSpecLink link = MaterialSpecLink.builder()
                    .id(UUID.randomUUID())
                    .materialId(material.getId())
                    .specId(spec.getId())
                    .isActive(false)
                    .linkedBy(actor)
                    .linkedAt(now)
                    .notes("Draft spec selection")
                    .createdAt(now)
                    .build();
            materialSpecLinkRepository.save(link);
        }
    }

    private void activateMaterialLinks(Spec spec, String actor) {
        List<MaterialSpecLink> pendingLinks = materialSpecLinkRepository.findBySpecIdAndDelinkedAtIsNullOrderByCreatedAtAsc(spec.getId());
        LocalDateTime now = LocalDateTime.now();

        for (MaterialSpecLink pendingLink : pendingLinks) {
            materialSpecLinkRepository.findByMaterialIdAndIsActiveTrue(pendingLink.getMaterialId())
                    .filter(activeLink -> !activeLink.getSpecId().equals(spec.getId()))
                    .ifPresent(activeLink -> {
                        activeLink.setIsActive(false);
                        activeLink.setDelinkedBy(actor);
                        activeLink.setDelinkedAt(now);
                        materialSpecLinkRepository.save(activeLink);
                    });

            pendingLink.setIsActive(true);
            pendingLink.setLinkedBy(actor);
            pendingLink.setLinkedAt(now);
            materialSpecLinkRepository.save(pendingLink);

            Material material = materialRepository.findById(pendingLink.getMaterialId())
                    .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + pendingLink.getMaterialId()));
            material.setSpecId(spec.getId());
            material.setUpdatedBy(actor);
            material.setUpdatedAt(now);
            materialRepository.save(material);
        }
    }

    private void cloneParameters(UUID sourceSpecId, UUID targetSpecId, String actor, LocalDateTime now) {
        List<SpecParameter> sourceParameters = specParameterRepository.findBySpecIdAndIsActiveTrueOrderBySequenceAsc(sourceSpecId);
        for (SpecParameter parameter : sourceParameters) {
            SpecParameter cloned = SpecParameter.builder()
                    .id(UUID.randomUUID())
                    .specId(targetSpecId)
                    .parameterName(parameter.getParameterName())
                    .testType(parameter.getTestType())
                    .moaId(parameter.getMoaId())
                    .criteriaType(parameter.getCriteriaType())
                    .lowerLimit(parameter.getLowerLimit())
                    .upperLimit(parameter.getUpperLimit())
                    .textCriteria(parameter.getTextCriteria())
                    .compendialChapterRef(parameter.getCompendialChapterRef())
                    .unit(parameter.getUnit())
                    .isMandatory(parameter.getIsMandatory())
                    .sequence(parameter.getSequence())
                    .notes(parameter.getNotes())
                    .isActive(true)
                    .createdBy(actor)
                    .createdAt(now)
                    .build();
            specParameterRepository.save(cloned);
        }
    }

    private void cloneMaterialSelections(UUID sourceSpecId, UUID targetSpecId, String actor, LocalDateTime now) {
        List<MaterialSpecLink> sourceLinks = materialSpecLinkRepository.findBySpecIdAndDelinkedAtIsNullOrderByCreatedAtAsc(sourceSpecId);
        for (MaterialSpecLink sourceLink : sourceLinks) {
            MaterialSpecLink cloned = MaterialSpecLink.builder()
                    .id(UUID.randomUUID())
                    .materialId(sourceLink.getMaterialId())
                    .specId(targetSpecId)
                    .isActive(false)
                    .linkedBy(actor)
                    .linkedAt(now)
                    .notes("Copied from previous approved revision")
                    .createdAt(now)
                    .build();
            materialSpecLinkRepository.save(cloned);
        }
    }

    private String nextRevisionValue(String currentRevision) {
        String normalized = safeRevision(currentRevision);
        int end = normalized.length() - 1;
        while (end >= 0 && Character.isDigit(normalized.charAt(end))) {
            end--;
        }
        if (end == normalized.length() - 1) {
            return normalized + "-2";
        }
        String prefix = normalized.substring(0, end + 1);
        String digits = normalized.substring(end + 1);
        int next = Integer.parseInt(digits) + 1;
        return prefix + String.format("%0" + digits.length() + "d", next);
    }

    private String safeRevision(String revision) {
        return StringUtils.hasText(revision) ? revision.trim() : "v1";
    }
}
