package com.batchsphere.core.batch.repository;

import com.batchsphere.core.batch.entity.Batch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BatchRepository extends JpaRepository<Batch, UUID> {
Optional<Batch> findByBatchNumber(String batchNumber);
boolean existsByBatchNumber(String batchNumber);
Page<Batch> findByISActiveTrue(Pageable pageable);
}
