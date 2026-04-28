package com.batchsphere.core.masterdata.spec.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LinkMaterialSpecRequest {
    @NotNull
    private UUID specId;
    private String notes;
}
