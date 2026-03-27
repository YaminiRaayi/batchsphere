package com.batchsphere.core.transcations.sampling.repository;

import com.batchsphere.core.transcations.sampling.entity.SamplingContainerSample;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SamplingContainerSampleRepository extends JpaRepository<SamplingContainerSample, UUID> {
    List<SamplingContainerSample> findBySamplingPlanIdOrderByContainerNumber(UUID samplingPlanId);
    void deleteBySamplingPlanId(UUID samplingPlanId);
}
