package com.batchsphere.core.hrms.training.dto;

import com.batchsphere.core.hrms.training.entity.TrainingType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateTrainingAssignmentRequest {
    @NotNull
    private UUID employeeId;
    @NotBlank
    private String assignedUsername;
    @NotBlank
    private String trainingTitle;
    @NotNull
    private TrainingType trainingType;
    private UUID documentId;
    private UUID revisionId;
    private String requiredRole;
    private LocalDate dueDate;
}
