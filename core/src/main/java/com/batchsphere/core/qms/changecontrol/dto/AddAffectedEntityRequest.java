package com.batchsphere.core.qms.changecontrol.dto;

import com.batchsphere.core.qms.changecontrol.entity.AffectedEntityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AddAffectedEntityRequest {
    @NotNull
    private AffectedEntityType entityType;
    @NotBlank
    private String entityReference;
    private UUID entityId;
    private String notes;
}
