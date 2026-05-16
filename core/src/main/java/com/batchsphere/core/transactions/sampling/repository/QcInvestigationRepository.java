package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcInvestigation;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface QcInvestigationRepository extends JpaRepository<QcInvestigation, UUID> {
    List<QcInvestigation> findBySamplingRequestIdAndIsActiveTrueOrderByCreatedAtAsc(UUID samplingRequestId);
    boolean existsByQcTestResultIdAndStatusInAndIsActiveTrue(UUID qcTestResultId, Collection<QcInvestigationStatus> statuses);
    boolean existsBySamplingRequestIdAndStatusInAndIsActiveTrue(UUID samplingRequestId, Collection<QcInvestigationStatus> statuses);

    @Query("""
            select count(i)
            from QcInvestigation i
            join Sample s on s.id = i.sampleId
            where i.isActive = true
              and s.isActive = true
              and s.materialId = :materialId
              and i.investigationType = :type
              and i.openedAt between :start and :end
            """)
    long countByMaterialAndTypeForApqr(@Param("materialId") UUID materialId,
                                       @Param("type") QcInvestigationType type,
                                       @Param("start") LocalDateTime start,
                                       @Param("end") LocalDateTime end);

    @Query("""
            select count(i)
            from QcInvestigation i
            join SamplingRequest sr on sr.id = i.samplingRequestId
            join GrnItem gi on gi.id = sr.grnItemId
            where i.isActive = true
              and sr.isActive = true
              and gi.isActive = true
              and i.investigationType = :type
              and i.status in :statuses
              and gi.vendorBatch = :lotNumber
              and (:materialId is null or gi.materialId = :materialId)
              and (:grnId is null or gi.grnId = :grnId)
            """)
    long countOpenInvestigationsForLot(@Param("lotNumber") String lotNumber,
                                       @Param("materialId") UUID materialId,
                                       @Param("grnId") UUID grnId,
                                       @Param("type") QcInvestigationType type,
                                       @Param("statuses") Collection<QcInvestigationStatus> statuses);
}
