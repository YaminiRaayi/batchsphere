package com.batchsphere.core.qms.changecontrol.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class ChangeControlAffectedEntityResponse {
    UUID id;
    String entityType;
    String entityReference;
    UUID entityId;
    String notes;
    LocalDateTime createdAt;
}
