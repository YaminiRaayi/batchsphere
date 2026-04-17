package com.batchsphere.core.transactions.inventory.repository;

import com.batchsphere.core.transactions.inventory.entity.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, UUID> {

    Page<InventoryTransaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
