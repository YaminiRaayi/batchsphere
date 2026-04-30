package com.batchsphere.core.masterdata.material.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class MaterialRequest {
    private String materialCode;

    @NotBlank(message = "Material name is required")
    private String materialName;

    private String materialCategory;

    private String genericNames;

    @NotBlank(message = "Material types is required")
    private String materialType;

    @NotBlank(message = "Unit of measure is required")
    private String uom;

    @NotNull(message = "Specification is required")
    private UUID specId;

    @NotNull(message = "Storage condition is required")
    private StorageCondition storageCondition;

    private String maxHumidity;

    private String lightSensitivity;

    @NotNull(message = "Photosensitive flag is required")
    private Boolean photosensitive;

    @NotNull(message = "Hygroscopic flag is required")
    private Boolean hygroscopic;

    @NotNull(message = "Hazardous flag is required")
    private Boolean hazardous;

    @NotNull(message = "Selective material flag is required")
    private Boolean selectiveMaterial;

    @NotNull(message = "Vendor CoA release flag is required")
    private Boolean vendorCoaReleaseAllowed;

    @NotNull(message = "Controlled substance flag is required")
    private Boolean controlledSubstance;

    @NotNull(message = "Sampling required flag is required")
    private Boolean samplingRequired;

    private Integer shelfLifeMonths;

    private Integer retestPeriodMonths;

    private String reorderLevel;

    private Integer leadTimeDays;

    private String hsnCode;

    private String casNumber;

    private String pharmacopoeialRef;

    private String description;

    @NotBlank(message = "CreatedBy is required")
    private String createdBy;

}
