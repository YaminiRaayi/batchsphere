package com.batchsphere.core.hrms.training.repository;

import com.batchsphere.core.hrms.training.entity.TrainingAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrainingAssignmentRepository extends JpaRepository<TrainingAssignment, UUID> {

    List<TrainingAssignment> findByIsActiveTrueOrderByAssignedAtDesc();

    List<TrainingAssignment> findByAssignedUsernameAndIsActiveTrueOrderByAssignedAtDesc(String assignedUsername);

    List<TrainingAssignment> findByEmployeeIdAndIsActiveTrueOrderByAssignedAtDesc(UUID employeeId);

    Optional<TrainingAssignment> findByIdAndIsActiveTrue(UUID id);
}
