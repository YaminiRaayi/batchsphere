package com.batchsphere.core.hrms.training.repository;

import com.batchsphere.core.hrms.training.entity.TrainingAssignment;
import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrainingAssignmentRepository extends JpaRepository<TrainingAssignment, UUID> {

    List<TrainingAssignment> findByIsActiveTrueOrderByAssignedAtDesc();

    List<TrainingAssignment> findByAssignedUsernameAndIsActiveTrueOrderByAssignedAtDesc(String assignedUsername);

    List<TrainingAssignment> findByEmployeeIdAndIsActiveTrueOrderByAssignedAtDesc(UUID employeeId);

    Optional<TrainingAssignment> findByIdAndIsActiveTrue(UUID id);

    long countByIsActiveTrueAndStatusNotAndDueDateBefore(TrainingAssignmentStatus status, LocalDate dueDate);

    List<TrainingAssignment> findByIsActiveTrueAndStatusNotAndDueDateBeforeOrderByDueDateAsc(
            TrainingAssignmentStatus status, LocalDate dueDate);

    boolean existsByAssignedUsernameAndTrainingTitleAndIsActiveTrue(String assignedUsername, String trainingTitle);

    boolean existsByAssignedUsernameAndTrainingTitleAndStatusAndIsActiveTrue(String assignedUsername, String trainingTitle, TrainingAssignmentStatus status);
}
