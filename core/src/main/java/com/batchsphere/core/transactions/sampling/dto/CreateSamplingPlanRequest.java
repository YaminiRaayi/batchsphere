package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.SampleType;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateSamplingPlanRequest {

    @NotNull
    private SamplingMethod samplingMethod;

    @NotNull
    private SampleType sampleType;

    @NotNull
    private UUID specId;

    @NotNull
    private UUID moaId;

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

    @NotBlank
    private String analystEmployeeCode;

    @NotNull
    private UUID samplingToolId;

    @NotNull
    private Boolean photosensitiveHandlingRequired;

    @NotNull
    private Boolean hygroscopicHandlingRequired;

    @NotNull
    private Boolean coaBasedRelease;

    private String rationale;

    private List<SamplingContainerSampleRequest> containerSamples;

    @NotBlank
    private String createdBy;
}
