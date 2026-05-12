package com.batchsphere.core.compliance.esign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateESignatureRequest extends ESignatureRequest {
    @NotBlank(message = "Entity type is required")
    private String entityType;

    @NotNull(message = "Entity id is required")
    private UUID entityId;

    @NotBlank(message = "Action is required")
    private String action;

    private String reason;
}
