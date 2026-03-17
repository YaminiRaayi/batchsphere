package com.batchsphere.core.transcations.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SamplingLabelUpdateRequest {

    private Boolean samplingLabelApplied;

    @NotBlank
    private String updatedBy;
}
