package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.GrnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GrnItemRepository extends JpaRepository<GrnItem, UUID> {

    List<GrnItem> findByGrnIdAndIsActiveTrueOrderByLineNumber(UUID grnId);

    List<GrnItem> findByGrnIdOrderByLineNumber(UUID grnId);

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
}
