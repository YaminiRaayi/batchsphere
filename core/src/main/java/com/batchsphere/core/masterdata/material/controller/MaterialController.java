package com.batchsphere.core.masterdata.material.controller;

import com.batchsphere.core.masterdata.material.dto.MaterialRequest;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.spec.dto.DelinkMaterialSpecRequest;
import com.batchsphere.core.masterdata.spec.dto.LinkMaterialSpecRequest;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.material.service.MaterialServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {
    private final MaterialServiceImpl materialService;

    @PostMapping
    public ResponseEntity<Material> createMaterialResponseEntity(@Valid @RequestBody MaterialRequest materialRequest){
        Material savedMaterial = materialService.createMaterial(materialRequest);
        return ResponseEntity.ok(savedMaterial);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Material> getMaterialById(@PathVariable UUID id){
        Material material = materialService.getMaterialById(id);
        return ResponseEntity.ok(material);
    }

    @GetMapping
    public ResponseEntity<Page<Material>> getAllMaterials(Pageable pageable){
        Page<Material> materials = materialService.getAllMaterials(pageable);
        return ResponseEntity.ok(materials);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateMaterial(@PathVariable UUID id){
        materialService.deactivateMaterial(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Material> updateMaterial(@PathVariable UUID id, @Valid @RequestBody MaterialRequest request){
        Material material = materialService.updateMaterial(id,request);
        return ResponseEntity.ok(material);
    }

    @PostMapping("/{id}/spec")
    public ResponseEntity<MaterialSpecLink> linkSpec(@PathVariable UUID id, @Valid @RequestBody LinkMaterialSpecRequest request) {
        return ResponseEntity.ok(materialService.linkSpec(id, request));
    }

    @DeleteMapping("/{id}/spec")
    public ResponseEntity<Void> delinkSpec(@PathVariable UUID id, @RequestBody(required = false) DelinkMaterialSpecRequest request) {
        materialService.delinkSpec(id, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/spec")
    public ResponseEntity<MaterialSpecLink> getActiveSpecLink(@PathVariable UUID id) {
        return ResponseEntity.ok(materialService.getActiveSpecLink(id));
    }

    @GetMapping("/{id}/spec/history")
    public ResponseEntity<List<MaterialSpecLink>> getSpecHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(materialService.getSpecHistory(id));
    }
}
