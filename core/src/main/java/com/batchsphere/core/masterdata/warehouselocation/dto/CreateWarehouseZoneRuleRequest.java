package com.batchsphere.core.masterdata.warehouselocation.dto;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateWarehouseZoneRuleRequest {

    @NotNull
    private UUID roomId;

    @NotBlank
    private String zoneName;

    private String allowedMaterialType;
    private StorageCondition allowedStorageCondition;
    private Boolean restrictedAccess;
    private Boolean quarantineOnly;
    private Boolean rejectedOnly;
    private String notes;
}
