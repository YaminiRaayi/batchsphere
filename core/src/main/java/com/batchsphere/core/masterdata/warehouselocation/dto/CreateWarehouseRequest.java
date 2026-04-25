package com.batchsphere.core.masterdata.warehouselocation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateWarehouseRequest {

    @NotBlank
    private String warehouseCode;

    @NotBlank
    private String warehouseName;

    @NotNull
    private UUID businessUnitId;

    private String description;

    @NotBlank
    private String createdBy;
}
