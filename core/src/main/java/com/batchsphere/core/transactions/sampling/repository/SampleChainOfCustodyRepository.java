package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.SampleChainOfCustody;
import com.batchsphere.core.transactions.sampling.entity.SampleCustodyEventType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SampleChainOfCustodyRepository extends JpaRepository<SampleChainOfCustody, UUID> {
    List<SampleChainOfCustody> findBySampleIdOrderByHandedOverAtAsc(UUID sampleId);
    List<SampleChainOfCustody> findBySamplingRequestIdOrderByHandedOverAtAsc(UUID samplingRequestId);
    Optional<SampleChainOfCustody> findFirstBySampleIdAndEventTypeAndReceivedAtIsNullAndIsActiveTrueOrderByHandedOverAtDesc(
            UUID sampleId,
            SampleCustodyEventType eventType
    );
}
