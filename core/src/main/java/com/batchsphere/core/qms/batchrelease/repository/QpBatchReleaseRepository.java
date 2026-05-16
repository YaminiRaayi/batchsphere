package com.batchsphere.core.qms.batchrelease.repository;

import com.batchsphere.core.qms.batchrelease.entity.BatchReleaseStatus;
import com.batchsphere.core.qms.batchrelease.entity.QpBatchRelease;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface QpBatchReleaseRepository extends JpaRepository<QpBatchRelease, UUID> {

  Optional<QpBatchRelease> findByIdAndIsActiveTrue(UUID id);

  Page<QpBatchRelease> findByIsActiveTrue(Pageable pageable);

  Page<QpBatchRelease> findByStatusAndIsActiveTrue(BatchReleaseStatus status, Pageable pageable);

  Page<QpBatchRelease> findByMaterialIdAndIsActiveTrue(UUID materialId, Pageable pageable);

  Page<QpBatchRelease> findByStatusAndMaterialIdAndIsActiveTrue(BatchReleaseStatus status, UUID materialId, Pageable pageable);

  @Query("select count(r) from QpBatchRelease r where r.isActive = true and r.status = :status")
  long countByStatus(@Param("status") BatchReleaseStatus status);

  long countByStatusAndCertifiedAtBetween(BatchReleaseStatus status, LocalDateTime start, LocalDateTime end);

  @Query(value = "select nextval('coa_number_seq')", nativeQuery = true)
  long nextCoaSequenceValue();
}
