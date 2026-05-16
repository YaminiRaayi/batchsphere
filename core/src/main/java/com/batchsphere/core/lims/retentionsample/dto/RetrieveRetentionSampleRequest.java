package com.batchsphere.core.lims.retentionsample.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RetrieveRetentionSampleRequest {

    @NotBlank(message = "retrievalReason is required")
    private String retrievalReason;

    private String testResultReference;
}
