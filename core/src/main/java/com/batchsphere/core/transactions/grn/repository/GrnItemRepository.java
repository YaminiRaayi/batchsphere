package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.GrnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GrnItemRepository extends JpaRepository<GrnItem, UUID> {

    List<GrnItem> findByGrnIdAndIsActiveTrueOrderByLineNumber(UUID grnId);

    List<GrnItem> findByGrnIdOrderByLineNumber(UUID grnId);

    Optional<GrnItem> findFirstByVendorBatchAndMaterialIdAndIsActiveTrueOrderByCreatedAtDesc(String vendorBatch, UUID materialId);

    List<GrnItem> findByVendorBatchIgnoreCaseAndIsActiveTrueOrderByCreatedAtDesc(String vendorBatch);

    Optional<GrnItem> findFirstByVendorBatchAndGrnIdAndIsActiveTrueOrderByCreatedAtDesc(String vendorBatch, UUID grnId);

    @Query("""
            select (count(item) > 0)
            from GrnItem item
            join Grn grn on grn.id = item.grnId
            where item.palletId = :palletId
              and item.isActive = true
              and grn.isActive = true
              and grn.status <> com.batchsphere.core.transactions.grn.entity.GrnStatus.CANCELLED
            """)
    boolean existsActiveUsageByPalletId(@Param("palletId") UUID palletId);

    @Query("""
            select distinct item.palletId
            from GrnItem item
            join Grn grn on grn.id = item.grnId
            where item.palletId in :palletIds
              and item.isActive = true
              and grn.isActive = true
              and grn.status <> com.batchsphere.core.transactions.grn.entity.GrnStatus.CANCELLED
            """)
    List<UUID> findDistinctActiveUsagePalletIdsByPalletIdIn(@Param("palletIds") List<UUID> palletIds);

    @Query("""
            select count(item)
            from GrnItem item
            join Grn grn on grn.id = item.grnId
            where item.materialId = :materialId
              and item.isActive = true
              and grn.isActive = true
              and grn.receiptDate between :periodStart and :periodEnd
              and grn.status <> com.batchsphere.core.transactions.grn.entity.GrnStatus.CANCELLED
            """)
    long countReceivedItemsForApqr(@Param("materialId") UUID materialId,
                                   @Param("periodStart") LocalDate periodStart,
                                   @Param("periodEnd") LocalDate periodEnd);

    @Query("""
            select count(item)
            from GrnItem item
            join Grn grn on grn.id = item.grnId
            where item.materialId = :materialId
              and item.isActive = true
              and grn.isActive = true
              and grn.receiptDate between :periodStart and :periodEnd
              and grn.status <> com.batchsphere.core.transactions.grn.entity.GrnStatus.CANCELLED
              and item.rejectedQuantity > 0
            """)
    long countRejectedItemsForApqr(@Param("materialId") UUID materialId,
                                   @Param("periodStart") LocalDate periodStart,
                                   @Param("periodEnd") LocalDate periodEnd);

    @Query("""
            select count(distinct item.batchId)
            from GrnItem item
            join Grn grn on grn.id = item.grnId
            where item.materialId = :materialId
              and item.batchId is not null
              and item.isActive = true
              and grn.isActive = true
              and grn.receiptDate between :periodStart and :periodEnd
              and grn.status <> com.batchsphere.core.transactions.grn.entity.GrnStatus.CANCELLED
            """)
    long countDistinctBatchesForApqr(@Param("materialId") UUID materialId,
                                     @Param("periodStart") LocalDate periodStart,
                                     @Param("periodEnd") LocalDate periodEnd);
}
