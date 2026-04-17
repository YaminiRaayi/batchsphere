package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.GrnContainer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrnContainerRepository extends JpaRepository<GrnContainer, UUID> {
    List<GrnContainer> findByGrnItemIdAndIsActiveTrueOrderByContainerNumber(UUID grnItemId);
    List<GrnContainer> findByGrnIdAndIsActiveTrueOrderByContainerNumber(UUID grnId);
}
