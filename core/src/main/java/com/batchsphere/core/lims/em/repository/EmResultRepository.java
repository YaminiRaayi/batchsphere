package com.batchsphere.core.lims.em.repository;

import com.batchsphere.core.lims.em.entity.EmResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface EmResultRepository extends JpaRepository<EmResult, UUID> {
    List<EmResult> findByPointIdAndRecordedAtBetweenAndIsActiveTrueOrderByRecordedAtAsc(UUID pointId, LocalDateTime from, LocalDateTime to);
    List<EmResult> findByRecordedAtBetweenAndIsActiveTrueOrderByRecordedAtDesc(LocalDateTime from, LocalDateTime to);
    List<EmResult> findByActionBreachedTrueAndLinkedDeviationIdIsNullAndBreachDismissedFalseAndIsActiveTrueOrderByRecordedAtDesc();
    List<EmResult> findByIsActiveTrueOrderByRecordedAtDesc();
}
