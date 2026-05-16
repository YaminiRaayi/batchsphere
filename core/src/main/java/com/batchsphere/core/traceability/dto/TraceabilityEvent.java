package com.batchsphere.core.traceability.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class TraceabilityEvent {
    String eventType;
    String eventLabel;
    String status;
    String actor;
    LocalDateTime timestamp;
    String referenceId;
    String referenceNumber;
    String remarks;
}
