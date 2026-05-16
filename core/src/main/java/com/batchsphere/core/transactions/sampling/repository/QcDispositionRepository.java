package com.batchsphere.core.transactions.sampling.repository;

import com.batchsphere.core.transactions.sampling.entity.QcDisposition;
import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface QcDispositionRepository extends JpaRepository<QcDisposition, UUID> {
    Optional<QcDisposition> findBySamplingRequestId(UUID samplingRequestId);
    Optional<QcDisposition> findBySampleId(UUID sampleId);

    @Query("""
            select (count(d) > 0)
            from QcDisposition d
            join SamplingRequest sr on sr.id = d.samplingRequestId
            join GrnItem gi on gi.id = sr.grnItemId
            where d.isActive = true
              and sr.isActive = true
              and gi.isActive = true
              and d.status = :status
              and gi.vendorBatch = :lotNumber
              and (:materialId is null or gi.materialId = :materialId)
              and (:grnId is null or gi.grnId = :grnId)
            """)
    boolean existsReleasedDispositionForLot(@Param("lotNumber") String lotNumber,
                                            @Param("materialId") UUID materialId,
                                            @Param("grnId") UUID grnId,
                                            @Param("status") QcDispositionStatus status);
}
