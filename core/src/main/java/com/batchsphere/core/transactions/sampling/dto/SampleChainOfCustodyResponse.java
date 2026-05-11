package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.SampleCustodyEventType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class SampleChainOfCustodyResponse {
    UUID id;
    UUID sampleId;
    UUID samplingRequestId;
    SampleCustodyEventType eventType;
    String fromLocation;
    String toLocation;
    String handedOverBy;
    LocalDateTime handedOverAt;
    String receivedBy;
    LocalDateTime receivedAt;
    String receiptCondition;
    String remarks;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
