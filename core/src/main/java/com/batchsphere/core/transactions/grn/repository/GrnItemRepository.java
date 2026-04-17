package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.GrnItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrnItemRepository extends JpaRepository<GrnItem, UUID> {

    List<GrnItem> findByGrnIdAndIsActiveTrueOrderByLineNumber(UUID grnId);

    List<GrnItem> findByGrnIdOrderByLineNumber(UUID grnId);
}
