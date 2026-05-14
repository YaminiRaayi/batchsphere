package com.batchsphere.core.qms.changecontrol.repository;

import com.batchsphere.core.qms.changecontrol.entity.ChangeControlTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChangeControlTaskRepository extends JpaRepository<ChangeControlTask, UUID> {
    List<ChangeControlTask> findByChangeControlIdAndIsActiveTrueOrderByCreatedAtAsc(UUID changeControlId);
    Optional<ChangeControlTask> findByIdAndChangeControlIdAndIsActiveTrue(UUID id, UUID changeControlId);
}
