package com.batchsphere.core.hrms.training.dto;

import com.batchsphere.core.hrms.training.entity.TrainingType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class RoleQualificationRequirementResponse {
    UUID id;
    String roleName;
    String trainingTitle;
    TrainingType trainingType;
    UUID documentId;
    UUID revisionId;
    String documentNumber;
    String documentRevision;
    Integer recurrenceMonths;
    Boolean isMandatory;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
