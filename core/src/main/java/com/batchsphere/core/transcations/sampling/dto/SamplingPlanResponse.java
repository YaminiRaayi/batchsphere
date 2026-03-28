package com.batchsphere.core.transcations.sampling.dto;

import com.batchsphere.core.transcations.sampling.entity.SampleType;
import com.batchsphere.core.transcations.sampling.entity.SamplingMethod;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class SamplingPlanResponse {
    UUID id;
    UUID samplingRequestId;
    UUID specId;
    UUID moaId;
    SamplingMethod samplingMethod;
    SampleType sampleType;
    Integer totalContainers;
    Integer containersToSample;
    BigDecimal individualSampleQuantity;
    BigDecimal compositeSampleQuantity;
    String samplingLocation;
    String analystEmployeeCode;
    UUID samplingToolId;
    Boolean photosensitiveHandlingRequired;
    Boolean hygroscopicHandlingRequired;
    Boolean coaBasedRelease;
    String rationale;
    Boolean samplingLabelApplied;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    List<SamplingContainerSampleResponse> containerSamples;
}
