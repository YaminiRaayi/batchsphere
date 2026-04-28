package com.batchsphere.core.transactions.sampling.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.UUID;

@Value
@Builder
public class SampleContainerLinkResponse {
    UUID id;
    UUID grnContainerId;
    String containerNumber;
    BigDecimal sampledQuantity;
}
