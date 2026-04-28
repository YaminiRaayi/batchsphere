package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcTestResult;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QcTestResultRepository extends JpaRepository<QcTestResult, UUID> {
    List<QcTestResult> findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(UUID sampleId);
    boolean existsBySampleIdAndIsActiveTrueAndStatusIn(UUID sampleId, List<QcTestResultStatus> statuses);
}
