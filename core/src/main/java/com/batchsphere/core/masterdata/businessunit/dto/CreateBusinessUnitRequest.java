package com.batchsphere.core.masterdata.businessunit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateBusinessUnitRequest {

    @NotBlank
    private String unitCode;

    @NotBlank
    private String unitName;

    private String description;

    @NotBlank
    private String createdBy;
}
