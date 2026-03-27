package com.batchsphere.core.transcations.sampling.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.UUID;

@Value
@Builder
public class SamplingContainerSampleResponse {
    UUID id;
    UUID grnContainerId;
    String containerNumber;
    BigDecimal sampledQuantity;
}
