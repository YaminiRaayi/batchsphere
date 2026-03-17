package com.batchsphere.core.transcations.sampling.dto;

import com.batchsphere.core.transcations.sampling.entity.SampleType;
import com.batchsphere.core.transcations.sampling.entity.SamplingMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateSamplingPlanRequest {

    @NotNull
    private SamplingMethod samplingMethod;

    @NotNull
    private SampleType sampleType;

    @Min(1)
    private Integer totalContainers;

    @Min(0)
    private Integer containersToSample;

    @DecimalMin(value = "0.000", inclusive = true)
    private BigDecimal individualSampleQuantity;

    @DecimalMin(value = "0.000", inclusive = true)
    private BigDecimal compositeSampleQuantity;

    @NotBlank
    private String samplingLocation;

    private String samplingToolInfo;

    @NotNull
    private Boolean photosensitiveHandlingRequired;

    @NotNull
    private Boolean hygroscopicHandlingRequired;

    @NotNull
    private Boolean coaBasedRelease;

    private String rationale;

    @NotBlank
    private String createdBy;
}
