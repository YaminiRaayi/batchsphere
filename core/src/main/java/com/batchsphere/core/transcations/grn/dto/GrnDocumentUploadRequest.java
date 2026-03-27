package com.batchsphere.core.transcations.grn.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GrnDocumentUploadRequest {
    @NotBlank
    private String documentName;
    @NotBlank
    private String documentType;
    private String documentUrl;
    @NotBlank
    private String createdBy;
}
