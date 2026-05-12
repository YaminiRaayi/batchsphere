package com.batchsphere.core.qms.deviation.dto;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
import com.batchsphere.core.qms.deviation.entity.DeviationSourceModule;
import com.batchsphere.core.qms.deviation.entity.DeviationStatus;
import com.batchsphere.core.qms.deviation.entity.DeviationType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class DeviationResponse {
    UUID id;
    String deviationNumber;
    String title;
    String description;
    DeviationType deviationType;
    DeviationSeverity severity;
    DeviationStatus status;
    DeviationSourceModule sourceModule;
    UUID sourceEntityId;
    String sourceReference;
    String department;
    String detectedBy;
    LocalDateTime detectedAt;
    String immediateAction;
    String investigationSummary;
    String rootCause;
    String impactAssessment;
    String closureSummary;
    String closedBy;
    LocalDateTime closedAt;
    UUID closureESignatureId;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
