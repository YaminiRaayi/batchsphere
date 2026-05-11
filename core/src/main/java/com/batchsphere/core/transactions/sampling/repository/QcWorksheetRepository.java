package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcWorksheet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface QcWorksheetRepository extends JpaRepository<QcWorksheet, UUID> {
    Optional<QcWorksheet> findBySampleIdAndIsActiveTrue(UUID sampleId);
}
