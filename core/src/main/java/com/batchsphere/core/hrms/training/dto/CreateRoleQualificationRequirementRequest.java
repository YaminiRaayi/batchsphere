package com.batchsphere.core.hrms.training.dto;

import com.batchsphere.core.hrms.training.entity.TrainingType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateRoleQualificationRequirementRequest {
    @NotBlank
    private String roleName;
    @NotBlank
    private String trainingTitle;
    @NotNull
    private TrainingType trainingType;
    private UUID documentId;
    private UUID revisionId;
    private Integer recurrenceMonths;
    private Boolean isMandatory;
}
