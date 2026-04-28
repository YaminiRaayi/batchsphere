package com.batchsphere.core.masterdata.material.service;

import com.batchsphere.core.masterdata.material.dto.MaterialRequest;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.spec.dto.DelinkMaterialSpecRequest;
import com.batchsphere.core.masterdata.spec.dto.LinkMaterialSpecRequest;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface MaterialServiceInterface {
    Material createMaterial(MaterialRequest materialRequest);
    Material getMaterialById(UUID id);
    Page<Material> getAllMaterials(Pageable pageable);
    void deactivateMaterial(UUID id);
    Material updateMaterial(UUID id, MaterialRequest request);
    MaterialSpecLink linkSpec(UUID materialId, LinkMaterialSpecRequest request);
    void delinkSpec(UUID materialId, DelinkMaterialSpecRequest request);
    MaterialSpecLink getActiveSpecLink(UUID materialId);
    List<MaterialSpecLink> getSpecHistory(UUID materialId);
}
