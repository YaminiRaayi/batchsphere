package com.batchsphere.core.hrms.training.service;

import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import com.batchsphere.core.hrms.training.repository.TrainingAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TrainingGateServiceImpl implements TrainingGateService {

    private final TrainingAssignmentRepository assignmentRepository;

    @Override
    public void assertTrainedForRequirement(String username, String requirementKey) {
        boolean anyAssigned = assignmentRepository
                .existsByAssignedUsernameAndTrainingTitleAndIsActiveTrue(username, requirementKey);
        if (!anyAssigned) {
            return;
        }
        boolean hasCompleted = assignmentRepository
                .existsByAssignedUsernameAndTrainingTitleAndStatusAndIsActiveTrue(
                        username, requirementKey, TrainingAssignmentStatus.COMPLETED);
        if (!hasCompleted) {
            throw new BusinessConflictException(
                    "Training gate: " + requirementKey + " not completed. Assign training in HRMS → Training.");
        }
    }
}
