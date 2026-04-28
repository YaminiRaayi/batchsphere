package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcDisposition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QcDispositionRepository extends JpaRepository<QcDisposition, UUID> {
    Optional<QcDisposition> findBySamplingRequestId(UUID samplingRequestId);
    Optional<QcDisposition> findBySampleId(UUID sampleId);
}
