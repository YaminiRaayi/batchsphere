package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.SamplingPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SamplingPlanRepository extends JpaRepository<SamplingPlan, UUID> {

    Optional<SamplingPlan> findBySamplingRequestId(UUID samplingRequestId);
}
