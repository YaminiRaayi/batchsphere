package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.Sample;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SampleRepository extends JpaRepository<Sample, UUID> {
    Optional<Sample> findBySamplingRequestId(UUID samplingRequestId);
}
