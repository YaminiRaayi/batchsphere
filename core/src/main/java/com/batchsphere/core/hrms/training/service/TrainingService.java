package com.batchsphere.core.hrms.training.service;

import com.batchsphere.core.hrms.training.dto.CompleteTrainingAssignmentRequest;
import com.batchsphere.core.hrms.training.dto.CreateRoleQualificationRequirementRequest;
import com.batchsphere.core.hrms.training.dto.CreateTrainingAssignmentRequest;
import com.batchsphere.core.hrms.training.dto.RoleQualificationRequirementResponse;
import com.batchsphere.core.hrms.training.dto.TrainingAssignmentResponse;

import java.util.List;
import java.util.UUID;

public interface TrainingService {
    TrainingAssignmentResponse createAssignment(CreateTrainingAssignmentRequest request);

    List<TrainingAssignmentResponse> getAssignments(UUID employeeId);

    List<TrainingAssignmentResponse> getMyAssignments();

    TrainingAssignmentResponse completeAssignment(UUID id, CompleteTrainingAssignmentRequest request);

    RoleQualificationRequirementResponse createRequirement(CreateRoleQualificationRequirementRequest request);

    List<RoleQualificationRequirementResponse> getRequirements();
}
