package com.batchsphere.core.qms.capa.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class CapaReassignmentResponse {
    UUID id;
    String previousOwner;
    String newOwner;
    String reason;
    String assignedBy;
    LocalDateTime assignedAt;
}
