package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.SamplingContainerDraw;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SamplingContainerDrawRepository extends JpaRepository<SamplingContainerDraw, UUID> {
    List<SamplingContainerDraw> findBySamplingPlanIdOrderBySampledAtAsc(UUID samplingPlanId);

    void deleteBySamplingPlanId(UUID samplingPlanId);
}
