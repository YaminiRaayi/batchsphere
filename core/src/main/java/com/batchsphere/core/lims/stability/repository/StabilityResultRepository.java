package com.batchsphere.core.lims.stability.repository;

import com.batchsphere.core.lims.stability.entity.StabilityResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StabilityResultRepository extends JpaRepository<StabilityResult, UUID> {
    List<StabilityResult> findByStudyIdAndIsActiveTrueOrderByEnteredAtAsc(UUID studyId);
    List<StabilityResult> findByTimepointIdAndIsActiveTrueOrderByParameterNameAsc(UUID timepointId);
    List<StabilityResult> findByStudyIdAndSpecParameterIdAndIsActiveTrue(UUID studyId, UUID specParameterId);
    Optional<StabilityResult> findByTimepointIdAndSpecParameterIdAndIsActiveTrue(UUID timepointId, UUID specParameterId);
    boolean existsByStudyIdAndOotFlagTrueAndIsActiveTrue(UUID studyId);
    long countByOotFlagTrueAndIsActiveTrue();
    List<StabilityResult> findByOotFlagTrueAndIsActiveTrueOrderByEnteredAtDesc();
}
