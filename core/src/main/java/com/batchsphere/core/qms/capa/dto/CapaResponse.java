package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.qms.capa.entity.CapaStatus;
import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class CapaResponse {
    UUID id;
    String capaNumber;
    UUID deviationId;
    String deviationNumber;
    String title;
    String description;
    DeviationSeverity severity;
    CapaStatus status;
    String owner;
    LocalDate dueDate;
    String correctiveAction;
    String preventiveAction;
    String effectivenessCheck;
    String completionSummary;
    String closedBy;
    LocalDateTime closedAt;
    UUID closureESignatureId;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
