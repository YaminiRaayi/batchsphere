package com.batchsphere.core.transactions.sampling.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.UUID;
import com.batchsphere.core.transactions.sampling.entity.SamplingDrawPurpose;

@Value
@Builder
public class SamplingContainerSampleResponse {
    UUID id;
    UUID grnContainerId;
    String containerNumber;
    BigDecimal sampledQuantity;
    SamplingDrawPurpose drawPurpose;
    BigDecimal balanceBefore;
    BigDecimal balanceAfter;
}
