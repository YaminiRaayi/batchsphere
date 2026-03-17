package com.batchsphere.core.masterdata.material.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MaterialRequest {
    @NotBlank(message = "Material code is required")
    private String materialCode;

    @NotBlank(message = "Material name is required")
    private String materialName;

    @NotBlank(message = "Material types is required")
    private String materialType;

    @NotBlank(message = "Unit of measure is required")
    private String uom;

    @NotNull(message = "Storage condition is required")
    private StorageCondition storageCondition;

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

    @NotNull(message = "Sampling required flag is required")
    private Boolean samplingRequired;

    private String description;

    @NotBlank(message = "CreatedBy is required")
    private String createdBy;

}
