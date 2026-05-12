package com.batchsphere.core.hrms.training.dto;

import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import com.batchsphere.core.hrms.training.entity.TrainingType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class TrainingAssignmentResponse {
    UUID id;
    String assignmentCode;
    UUID employeeId;
    String employeeCode;
    String employeeName;
    String employeeDepartment;
    String employeeJobTitle;
    String assignedUsername;
    String trainingTitle;
    TrainingType trainingType;
    UUID documentId;
    UUID revisionId;
    String documentNumber;
    String documentRevision;
    String requiredRole;
    TrainingAssignmentStatus status;
    LocalDate dueDate;
    LocalDateTime completedAt;
    String completedBy;
    String completionComments;
    String assignedBy;
    LocalDateTime assignedAt;
    Boolean isActive;
}
