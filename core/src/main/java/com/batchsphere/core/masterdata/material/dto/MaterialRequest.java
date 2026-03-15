package com.batchsphere.core.masterdata.material.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MaterialRequest {
    @NotBlank(message = "Material code is required")
    private String materialCode;

    @NotBlank(message = "Material name is required")
    private String materialName;

    @NotBlank(message = "Material types is required")
    private String materialType;

    @NotBlank(message = "CreatedBy is required")
    private String createdBy;

}
