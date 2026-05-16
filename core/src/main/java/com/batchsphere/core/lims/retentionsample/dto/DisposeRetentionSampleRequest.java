package com.batchsphere.core.lims.retentionsample.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DisposeRetentionSampleRequest {

    @NotBlank(message = "disposalReason is required")
    private String disposalReason;

    @NotBlank(message = "disposalMethod is required")
    private String disposalMethod;
}
