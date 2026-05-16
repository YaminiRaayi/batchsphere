package com.batchsphere.core.lims.retentionsample.repository;

import com.batchsphere.core.lims.retentionsample.entity.RetentionSample;
import com.batchsphere.core.lims.retentionsample.entity.RetentionSampleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RetentionSampleRepository extends JpaRepository<RetentionSample, UUID> {

    Optional<RetentionSample> findByIdAndIsActiveTrue(UUID id);

    @Query("""
        SELECT r FROM RetentionSample r
        WHERE r.isActive = true
          AND (:status IS NULL OR r.status = :status)
          AND (:materialId IS NULL OR r.materialId = :materialId)
          AND (:lotNumber IS NULL OR LOWER(r.lotNumber) LIKE LOWER(CONCAT('%', :lotNumber, '%')))
        """)
    Page<RetentionSample> findByFilters(
            @Param("status") RetentionSampleStatus status,
            @Param("materialId") UUID materialId,
            @Param("lotNumber") String lotNumber,
            Pageable pageable);

    List<RetentionSample> findByIsActiveTrueAndStatusAndRetentionUntilBefore(
            RetentionSampleStatus status, LocalDate date);

    @Query("""
        SELECT r FROM RetentionSample r
        WHERE r.isActive = true
          AND r.status = :status
          AND r.retentionUntil >= :from
          AND r.retentionUntil <= :to
        """)
    List<RetentionSample> findExpiringSoon(
            @Param("status") RetentionSampleStatus status,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    long countByIsActiveTrueAndStatus(RetentionSampleStatus status);

    @Query("""
        SELECT count(r) FROM RetentionSample r
        WHERE r.isActive = true
          AND r.status = 'STORED'
          AND r.retentionUntil < :today
        """)
    long countOverdueDisposal(@Param("today") LocalDate today);

    @Query("""
        SELECT count(r) FROM RetentionSample r
        WHERE r.isActive = true
          AND r.status = 'RETRIEVED'
          AND r.retrievedAt >= :since
        """)
    long countRetrievedSince(@Param("since") java.time.OffsetDateTime since);
}
