package com.batchsphere.core.transactions.inventory.repository;

import com.batchsphere.core.transactions.inventory.entity.Inventory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Page<Inventory> findByIsActiveTrue(Pageable pageable);

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
}
