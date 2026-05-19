package com.batchsphere.core.lims.stability.repository;

import com.batchsphere.core.lims.stability.entity.StabilityTimepoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StabilityTimepointRepository extends JpaRepository<StabilityTimepoint, UUID> {
    List<StabilityTimepoint> findByStudyIdAndIsActiveTrueOrderByMonthOffsetAsc(UUID studyId);
    List<StabilityTimepoint> findByScheduledDateBetweenAndStatusAndIsActiveTrueOrderByScheduledDateAsc(LocalDate from, LocalDate to, String status);
}
