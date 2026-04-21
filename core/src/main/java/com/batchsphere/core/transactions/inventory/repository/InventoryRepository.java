package com.batchsphere.core.transactions.inventory.repository;

import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Page<Inventory> findByIsActiveTrue(Pageable pageable);

    boolean existsByPalletIdAndIsActiveTrue(UUID palletId);

    Optional<Inventory> findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
            UUID materialId,
            UUID batchId,
            UUID palletId
    );

    Optional<Inventory> findByMaterialIdAndBatchIdAndPalletId(
            UUID materialId,
            UUID batchId,
            UUID palletId
    );

    @Query("select distinct i.palletId from Inventory i where i.isActive = true and i.palletId in :palletIds")
    List<UUID> findDistinctActivePalletIdsByPalletIdIn(@Param("palletIds") List<UUID> palletIds);

    @Query("select i.status, count(i) from Inventory i where i.isActive = true group by i.status")
    List<Object[]> countActiveByStatus();
}
