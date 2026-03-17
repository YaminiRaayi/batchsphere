package com.batchsphere.core.transcations.sampling.repository;

import com.batchsphere.core.transcations.sampling.entity.SamplingRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SamplingRequestRepository extends JpaRepository<SamplingRequest, UUID> {

    Optional<SamplingRequest> findByGrnItemId(UUID grnItemId);

    Page<SamplingRequest> findByIsActiveTrue(Pageable pageable);
}
