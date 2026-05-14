package com.batchsphere.core.qms.changecontrol.repository;

import com.batchsphere.core.qms.changecontrol.entity.ChangeControlAffectedEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChangeControlAffectedEntityRepository extends JpaRepository<ChangeControlAffectedEntity, UUID> {
    List<ChangeControlAffectedEntity> findByChangeControlIdOrderByCreatedAtAsc(UUID changeControlId);
    Optional<ChangeControlAffectedEntity> findByIdAndChangeControlId(UUID id, UUID changeControlId);
}
