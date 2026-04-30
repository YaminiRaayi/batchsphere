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

    @Column(name = "material_category", length = 50)
    private String materialCategory;

    @Column(name = "generic_names", length = 500)
    private String genericNames;

    @Column(name = "material_type", nullable = false, length = 50)
    private String materialType;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Column(name = "spec_id")
    private UUID specId;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_condition", nullable = false, length = 50)
    private StorageCondition storageCondition;

    @Column(name = "max_humidity", length = 100)
    private String maxHumidity;

    @Column(name = "light_sensitivity", length = 50)
    private String lightSensitivity;

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

    @Builder.Default
    @Column(name = "controlled_substance", nullable = false)
    private Boolean controlledSubstance = false;

    @Column(name = "sampling_required", nullable = false)
    private Boolean samplingRequired;

    @Column(name = "shelf_life_months")
    private Integer shelfLifeMonths;

    @Column(name = "retest_period_months")
    private Integer retestPeriodMonths;

    @Column(name = "reorder_level", length = 100)
    private String reorderLevel;

    @Column(name = "lead_time_days")
    private Integer leadTimeDays;

    @Column(name = "hsn_code", length = 50)
    private String hsnCode;

    @Column(name = "cas_number", length = 100)
    private String casNumber;

    @Column(name = "pharmacopoeial_ref", length = 100)
    private String pharmacopoeialRef;

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
