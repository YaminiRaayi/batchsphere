package com.batchsphere.core.masterdata.warehouselocation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateMaterialLocationRuleRequest {

    @NotNull
    private UUID materialId;

    private UUID defaultWarehouseId;
    private UUID defaultRoomId;
    private UUID defaultRackId;
    private UUID quarantineWarehouseId;
    private UUID quarantineRoomId;
    private String notes;
}
