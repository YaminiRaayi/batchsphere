package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.Sample;
import com.batchsphere.core.transactions.sampling.entity.SampleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SampleRepository extends JpaRepository<Sample, UUID> {
    Optional<Sample> findBySamplingRequestId(UUID samplingRequestId);
    Optional<Sample> findBySamplingRequestIdAndSampleType(UUID samplingRequestId, SampleType sampleType);
    Optional<Sample> findFirstBySamplingRequestIdOrderByCreatedAtAsc(UUID samplingRequestId);
    List<Sample> findBySamplingRequestIdOrderBySampleTypeAscCreatedAtAsc(UUID samplingRequestId);
}
