package com.batchsphere.core.transcations.inventory.repository;

import com.batchsphere.core.transcations.inventory.entity.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, UUID> {

    Page<InventoryTransaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
