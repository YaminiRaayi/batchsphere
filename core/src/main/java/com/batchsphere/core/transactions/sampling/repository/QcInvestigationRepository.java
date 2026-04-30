package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcInvestigation;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QcInvestigationRepository extends JpaRepository<QcInvestigation, UUID> {
    List<QcInvestigation> findBySamplingRequestIdAndIsActiveTrueOrderByCreatedAtAsc(UUID samplingRequestId);
    boolean existsByQcTestResultIdAndStatusInAndIsActiveTrue(UUID qcTestResultId, Collection<QcInvestigationStatus> statuses);
    boolean existsBySamplingRequestIdAndStatusInAndIsActiveTrue(UUID samplingRequestId, Collection<QcInvestigationStatus> statuses);
}
