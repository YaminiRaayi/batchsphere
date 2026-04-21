package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SamplingRequestRepository extends JpaRepository<SamplingRequest, UUID> {

    Optional<SamplingRequest> findByGrnItemId(UUID grnItemId);

    List<SamplingRequest> findByGrnIdAndIsActiveTrue(UUID grnId);

    Page<SamplingRequest> findByIsActiveTrue(Pageable pageable);

    @Query("select s.requestStatus, count(s) from SamplingRequest s where s.isActive = true group by s.requestStatus")
    List<Object[]> countActiveByStatus();
}
