package com.batchsphere.core.masterdata.moa.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MoaRequest {
    @NotBlank
    private String moaCode;
    @NotBlank
    private String moaName;
    private String revision;
    private String referenceAttachment;
    @NotBlank
    private String createdBy;
}
