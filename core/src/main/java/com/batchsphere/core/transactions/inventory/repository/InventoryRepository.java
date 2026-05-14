package com.batchsphere.core.transactions.inventory.repository;

import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Page<Inventory> findByIsActiveTrueAndQuantityOnHandGreaterThan(java.math.BigDecimal quantityOnHand, Pageable pageable);

    List<Inventory> findByIsActiveTrue();

    List<Inventory> findByIsActiveTrueAndQuantityOnHandGreaterThan(java.math.BigDecimal quantityOnHand);

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

    List<Inventory> findByMaterialIdAndStatusAndIsActiveTrue(UUID materialId, InventoryStatus status);

    @Query("select distinct i.palletId from Inventory i where i.isActive = true and i.palletId in :palletIds")
    List<UUID> findDistinctActivePalletIdsByPalletIdIn(@Param("palletIds") List<UUID> palletIds);

    @Query("select i.status, count(i) from Inventory i where i.isActive = true and i.quantityOnHand > 0 group by i.status")
    List<Object[]> countActiveByStatus();

    @Query("select count(i) from Inventory i where i.isActive = true and i.quantityOnHand > 0 and i.expiryDate is not null and i.expiryDate between :from and :to")
    Long countExpiringBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
