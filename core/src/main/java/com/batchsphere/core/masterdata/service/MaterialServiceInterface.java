package com.batchsphere.core.masterdata.service;

import com.batchsphere.core.masterdata.dto.MaterialRequest;
import com.batchsphere.core.masterdata.entity.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface MaterialServiceInterface {
    Material createMaterial(MaterialRequest materialRequest);
    Material getMaterialById(UUID id);
    Page<Material> getAllMaterials(Pageable pageable);
    void deactivateMaterial(UUID id);
    Material updateMaterial(UUID id, MaterialRequest request);
}

