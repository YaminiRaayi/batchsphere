package com.batchsphere.core.masterdata.material.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.dto.MaterialRequest;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.spec.dto.DelinkMaterialSpecRequest;
import com.batchsphere.core.masterdata.spec.dto.LinkMaterialSpecRequest;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.spec.repository.MaterialSpecLinkRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class MaterialServiceImpl implements  MaterialServiceInterface{
    private final MaterialRepository materialRepository;
    private final SpecRepository specRepository;
    private final MaterialSpecLinkRepository materialSpecLinkRepository;
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public Material createMaterial(MaterialRequest materialRequest) {
        String actor = authenticatedActorService.currentActor();
        String materialCode = resolveMaterialCodeForCreate(materialRequest);
        if(materialRepository.existsByMaterialCode(materialCode)){
            throw new DuplicateResourceException("Matreila code already exists");
        }
        Spec spec = specRepository.findById(materialRequest.getSpecId())
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + materialRequest.getSpecId()));
        validateMaterialLinkableSpec(spec);
        log.info("Creating material with request: {}", materialRequest.toString());

        Material material = Material.builder().id(UUID.randomUUID())
                .materialCode(materialCode)
                .materialName(materialRequest.getMaterialName())
                .materialType(materialRequest.getMaterialType())
                .uom(materialRequest.getUom())
                .specId(materialRequest.getSpecId())
                .storageCondition(materialRequest.getStorageCondition())
                .photosensitive(materialRequest.getPhotosensitive())
                .hygroscopic(materialRequest.getHygroscopic())
                .hazardous(materialRequest.getHazardous())
                .selectiveMaterial(materialRequest.getSelectiveMaterial())
                .vendorCoaReleaseAllowed(materialRequest.getVendorCoaReleaseAllowed())
                .samplingRequired(materialRequest.getSamplingRequired())
                .description(materialRequest.getDescription())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now()).build();
        Material savedMaterial = materialRepository.save(material);
        createOrReplaceActiveLink(savedMaterial, spec, actor, "Initial material-spec link");
        return savedMaterial;
    }

    /**
     * @param id
     * @return
     */
    @Override
    public Material getMaterialById(UUID id) {
        return materialRepository.findById(id).orElseThrow(()->new ResourceNotFoundException("Material Not Found Exception," +id));
    }

    /**
     * @param pageable
     * @return
     */
    @Override
    public Page<Material> getAllMaterials(Pageable pageable) {
       return materialRepository.findByIsActiveTrue(pageable);
    }

    /**
     * @param id
     */
    @Override
    public void deactivateMaterial(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Material material = materialRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Material Not Found with id: " +id));
        material.setIsActive(false);
        material.setUpdatedBy(actor);
        material.setUpdatedAt(LocalDateTime.now());

        materialRepository.save(material);
    }

    /**
     * @param id
     * @param request
     * @return
     */
    @Override
    public Material updateMaterial(UUID id, MaterialRequest request) {
        String actor = authenticatedActorService.currentActor();
        Material material = materialRepository.findById(id)
                .orElseThrow(()->new ResourceNotFoundException("Materila not found with id: "+ id));
        String materialCode = StringUtils.hasText(request.getMaterialCode())
                ? request.getMaterialCode().trim().toUpperCase(Locale.ROOT)
                : material.getMaterialCode();
        if(!material.getMaterialCode().equals(materialCode) &&
        materialRepository.existsByMaterialCode(materialCode)){
            throw  new DuplicateResourceException("Material code already exists: "+ materialCode);
        }
        Spec spec = specRepository.findById(request.getSpecId())
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + request.getSpecId()));
        validateMaterialLinkableSpec(spec);
        material.setMaterialCode(materialCode);
        material.setMaterialName(request.getMaterialName());
        material.setMaterialType(request.getMaterialType());
        material.setUom(request.getUom());
        material.setSpecId(request.getSpecId());
        material.setStorageCondition(request.getStorageCondition());
        material.setPhotosensitive(request.getPhotosensitive());
        material.setHygroscopic(request.getHygroscopic());
        material.setHazardous(request.getHazardous());
        material.setSelectiveMaterial(request.getSelectiveMaterial());
        material.setVendorCoaReleaseAllowed(request.getVendorCoaReleaseAllowed());
        material.setSamplingRequired(request.getSamplingRequired());
        material.setDescription(request.getDescription());
        material.setUpdatedAt(LocalDateTime.now());
        material.setUpdatedBy(actor);
        Material savedMaterial = materialRepository.save(material);
        createOrReplaceActiveLink(savedMaterial, spec, actor, "Material-spec link updated from material master");
        return savedMaterial;
    }

    @Override
    public MaterialSpecLink linkSpec(UUID materialId, LinkMaterialSpecRequest request) {
        String actor = authenticatedActorService.currentActor();
        Material material = getMaterialById(materialId);
        Spec spec = specRepository.findById(request.getSpecId())
                .orElseThrow(() -> new ResourceNotFoundException("Spec not found with id: " + request.getSpecId()));
        validateMaterialLinkableSpec(spec);
        material.setSpecId(spec.getId());
        material.setUpdatedBy(actor);
        material.setUpdatedAt(LocalDateTime.now());
        materialRepository.save(material);
        return createOrReplaceActiveLink(material, spec, actor, request.getNotes());
    }

    @Override
    public void delinkSpec(UUID materialId, DelinkMaterialSpecRequest request) {
        String actor = authenticatedActorService.currentActor();
        Material material = getMaterialById(materialId);
        MaterialSpecLink activeLink = materialSpecLinkRepository.findByMaterialIdAndIsActiveTrue(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Active material-spec link not found for material id: " + materialId));
        activeLink.setIsActive(false);
        activeLink.setDelinkedBy(actor);
        activeLink.setDelinkedAt(LocalDateTime.now());
        if (StringUtils.hasText(request != null ? request.getNotes() : null)) {
            activeLink.setNotes(request.getNotes().trim());
        }
        materialSpecLinkRepository.save(activeLink);
        material.setSpecId(null);
        material.setUpdatedBy(actor);
        material.setUpdatedAt(LocalDateTime.now());
        materialRepository.save(material);
    }

    @Override
    public MaterialSpecLink getActiveSpecLink(UUID materialId) {
        getMaterialById(materialId);
        return materialSpecLinkRepository.findByMaterialIdAndIsActiveTrue(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Active material-spec link not found for material id: " + materialId));
    }

    @Override
    public java.util.List<MaterialSpecLink> getSpecHistory(UUID materialId) {
        getMaterialById(materialId);
        return materialSpecLinkRepository.findByMaterialIdOrderByLinkedAtDesc(materialId);
    }

    private String resolveMaterialCodeForCreate(MaterialRequest request) {
        if (StringUtils.hasText(request.getMaterialCode())) {
            return request.getMaterialCode().trim().toUpperCase(Locale.ROOT);
        }
        String prefix = materialCodePrefix(request.getMaterialType());
        int nextSequence = materialRepository.findByMaterialCodeStartingWith(prefix + "-").stream()
                .map(Material::getMaterialCode)
                .map(code -> code.substring((prefix + "-").length()))
                .filter(suffix -> suffix.matches("\\d+"))
                .mapToInt(Integer::parseInt)
                .max()
                .orElse(0) + 1;
        return "%s-%05d".formatted(prefix, nextSequence);
    }

    private String materialCodePrefix(String materialType) {
        if (materialType == null) {
            return "MAT";
        }
        return switch (materialType.trim().toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> "RM";
            case "NON_CRITICAL" -> "PM";
            case "FINISHED_GOODS" -> "FG";
            case "IN_PROCESS" -> "IP";
            default -> "MAT";
        };
    }

    private void validateMaterialLinkableSpec(Spec spec) {
        if (!Boolean.TRUE.equals(spec.getIsActive())) {
            throw new BusinessConflictException("Inactive specs cannot be linked to materials");
        }
        if (spec.getStatus() != SpecStatus.APPROVED) {
            throw new BusinessConflictException("Only APPROVED specs can be linked to materials");
        }
    }

    private MaterialSpecLink createOrReplaceActiveLink(Material material, Spec spec, String actor, String notes) {
        MaterialSpecLink activeLink = materialSpecLinkRepository.findByMaterialIdAndIsActiveTrue(material.getId()).orElse(null);
        if (activeLink != null && activeLink.getSpecId().equals(spec.getId())) {
            return activeLink;
        }
        LocalDateTime now = LocalDateTime.now();
        if (activeLink != null) {
            activeLink.setIsActive(false);
            activeLink.setDelinkedBy(actor);
            activeLink.setDelinkedAt(now);
            materialSpecLinkRepository.save(activeLink);
        }
        MaterialSpecLink newLink = MaterialSpecLink.builder()
                .id(UUID.randomUUID())
                .materialId(material.getId())
                .specId(spec.getId())
                .isActive(true)
                .linkedBy(actor)
                .linkedAt(now)
                .notes(StringUtils.hasText(notes) ? notes.trim() : null)
                .createdAt(now)
                .build();
        return materialSpecLinkRepository.save(newLink);
    }
}
