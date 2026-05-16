package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcTestResult;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QcTestResultRepository extends JpaRepository<QcTestResult, UUID> {
    List<QcTestResult> findBySampleIdAndIsActiveTrueOrderByCreatedAtAsc(UUID sampleId);
    List<QcTestResult> findByWorksheetIdAndIsActiveTrueOrderByCreatedAtAsc(UUID worksheetId);
    boolean existsBySampleIdAndIsActiveTrueAndStatusIn(UUID sampleId, List<QcTestResultStatus> statuses);

    @Modifying
    @Query("UPDATE QcTestResult q SET q.isLocked = true WHERE q.sampleId IN :sampleIds AND q.isActive = true")
    void lockAllBySampleIdIn(@Param("sampleIds") Collection<UUID> sampleIds);

    @Query("""
            select count(q)
            from QcTestResult q
            join Sample s on s.id = q.sampleId
            where q.isActive = true
              and s.isActive = true
              and s.materialId = :materialId
              and q.status = :status
              and q.createdAt between :start and :end
            """)
    long countByMaterialAndStatusForApqr(@Param("materialId") UUID materialId,
                                         @Param("status") QcTestResultStatus status,
                                         @Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end);
}
