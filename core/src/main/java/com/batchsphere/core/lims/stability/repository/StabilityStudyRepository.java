package com.batchsphere.core.lims.stability.repository;

import com.batchsphere.core.lims.stability.entity.StabilityStudy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StabilityStudyRepository extends JpaRepository<StabilityStudy, UUID> {
    boolean existsByStudyNumberIgnoreCase(String studyNumber);
    List<StabilityStudy> findByIsActiveTrueOrderByCreatedAtDesc();
}
