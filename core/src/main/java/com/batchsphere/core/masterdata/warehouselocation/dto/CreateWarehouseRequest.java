package com.batchsphere.core.masterdata.warehouselocation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateWarehouseRequest {

    @NotBlank
    private String warehouseCode;

    @NotBlank
    private String warehouseName;

    private String description;

    @NotBlank
    private String createdBy;
}
