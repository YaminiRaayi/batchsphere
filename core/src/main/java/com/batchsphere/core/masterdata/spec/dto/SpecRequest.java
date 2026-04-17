package com.batchsphere.core.masterdata.spec.dto;

import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SpecRequest {
    @NotBlank
    private String specCode;
    @NotBlank
    private String specName;
    private String revision;
    @NotNull
    private SamplingMethod samplingMethod;
    private String referenceAttachment;
    @NotBlank
    private String createdBy;
}
