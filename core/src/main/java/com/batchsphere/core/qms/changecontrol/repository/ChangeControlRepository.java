package com.batchsphere.core.qms.changecontrol.repository;

import com.batchsphere.core.qms.changecontrol.entity.ChangeControl;
import com.batchsphere.core.qms.changecontrol.entity.ChangeControlStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface ChangeControlRepository extends JpaRepository<ChangeControl, UUID> {
    boolean existsByChangeControlNumber(String changeControlNumber);
    Page<ChangeControl> findByIsActiveTrue(Pageable pageable);
    Optional<ChangeControl> findByIdAndIsActiveTrue(UUID id);
    long countByIsActiveTrueAndCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    long countByIsActiveTrueAndStatusNotIn(Collection<ChangeControlStatus> statuses);
    long countByIsActiveTrueAndStatus(ChangeControlStatus status);
}
