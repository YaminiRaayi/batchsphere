package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SamplingRequestRepository extends JpaRepository<SamplingRequest, UUID> {

    Optional<SamplingRequest> findByGrnItemIdAndParentSamplingRequestIdIsNull(UUID grnItemId);

    List<SamplingRequest> findByGrnIdAndIsActiveTrue(UUID grnId);

    boolean existsByParentSamplingRequestIdAndIsActiveTrue(UUID parentSamplingRequestId);

    List<SamplingRequest> findByRootSamplingRequestIdAndIsActiveTrueOrderByCycleNumberAsc(UUID rootSamplingRequestId);

    Page<SamplingRequest> findByIsActiveTrue(Pageable pageable);

    @Query("select s.requestStatus, count(s) from SamplingRequest s where s.isActive = true group by s.requestStatus")
    List<Object[]> countActiveByStatus();

    @Query("select coalesce(max(s.cycleNumber), 0) from SamplingRequest s where s.rootSamplingRequestId = :rootSamplingRequestId")
    Integer findMaxCycleNumberByRootSamplingRequestId(@Param("rootSamplingRequestId") UUID rootSamplingRequestId);
}
