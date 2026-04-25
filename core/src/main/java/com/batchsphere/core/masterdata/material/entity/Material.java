package com.batchsphere.core.masterdata.material.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "material")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class Material {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "material_code", nullable = false, unique = true, length = 50)
    private String materialCode;

    @Column(name = "material_name", nullable = false, length = 255)
    private String materialName;

    @Column(name = "material_type", nullable = false, length = 50)
    private String materialType;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Column(name = "spec_id")
    private UUID specId;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_condition", nullable = false, length = 50)
    private StorageCondition storageCondition;

    @Column(name = "photosensitive", nullable = false)
    private Boolean photosensitive;

    @Column(name = "hygroscopic", nullable = false)
    private Boolean hygroscopic;

    @Column(name = "hazardous", nullable = false)
    private Boolean hazardous;

    @Column(name = "selective_material", nullable = false)
    private Boolean selectiveMaterial;

    @Column(name = "vendor_coa_release_allowed", nullable = false)
    private Boolean vendorCoaReleaseAllowed;

    @Column(name = "sampling_required", nullable = false)
    private Boolean samplingRequired;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
