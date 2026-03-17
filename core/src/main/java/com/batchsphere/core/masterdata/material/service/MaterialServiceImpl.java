package com.batchsphere.core.masterdata.material.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.dto.MaterialRequest;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class MaterialServiceImpl implements  MaterialServiceInterface{
    private final MaterialRepository materialRepository;

    @Override
    public Material createMaterial(MaterialRequest materialRequest) {
        if(materialRepository.existsByMaterialCode(materialRequest.getMaterialCode())){
            throw new DuplicateResourceException("Matreila code already exists");
        }
        log.info("Creating material with request: {}", materialRequest.toString());

        Material material = Material.builder().id(UUID.randomUUID())
                .materialCode(materialRequest.getMaterialCode())
                .materialName(materialRequest.getMaterialName())
                .materialType(materialRequest.getMaterialType())
                .uom(materialRequest.getUom())
                .storageCondition(materialRequest.getStorageCondition())
                .photosensitive(materialRequest.getPhotosensitive())
                .hygroscopic(materialRequest.getHygroscopic())
                .hazardous(materialRequest.getHazardous())
                .selectiveMaterial(materialRequest.getSelectiveMaterial())
                .vendorCoaReleaseAllowed(materialRequest.getVendorCoaReleaseAllowed())
                .samplingRequired(materialRequest.getSamplingRequired())
                .description(materialRequest.getDescription())
                .isActive(true)
                .createdBy(materialRequest.getCreatedBy())
                .createdAt(LocalDateTime.now()).build();
        return materialRepository.save(material);
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
        Material material = materialRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Material Not Found with id: " +id));
        material.setIsActive(false);
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
        Material material = materialRepository.findById(id)
                .orElseThrow(()->new ResourceNotFoundException("Materila not found with id: "+ id));
        if(!material.getMaterialCode().equals(request.getMaterialCode()) &&
        materialRepository.existsByMaterialCode(request.getMaterialCode())){
            throw  new DuplicateResourceException("Material code already exists: "+ request.getMaterialCode());
        }
        material.setMaterialCode(request.getMaterialCode());
        material.setMaterialName(request.getMaterialName());
        material.setMaterialType(request.getMaterialType());
        material.setUom(request.getUom());
        material.setStorageCondition(request.getStorageCondition());
        material.setPhotosensitive(request.getPhotosensitive());
        material.setHygroscopic(request.getHygroscopic());
        material.setHazardous(request.getHazardous());
        material.setSelectiveMaterial(request.getSelectiveMaterial());
        material.setVendorCoaReleaseAllowed(request.getVendorCoaReleaseAllowed());
        material.setSamplingRequired(request.getSamplingRequired());
        material.setDescription(request.getDescription());
        material.setUpdatedAt(LocalDateTime.now());
        material.setUpdatedBy(request.getCreatedBy());

        return  materialRepository.save(material);
    }
}
