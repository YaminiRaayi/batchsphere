package com.batchsphere.core.masterdata.samplingtool.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SamplingToolRequest {
    @NotBlank
    private String toolCode;
    @NotBlank
    private String toolName;
    private String description;
    @NotBlank
    private String createdBy;
}
