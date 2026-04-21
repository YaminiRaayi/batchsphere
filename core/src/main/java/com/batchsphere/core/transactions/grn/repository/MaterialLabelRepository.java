package com.batchsphere.core.transactions.grn.repository;

import com.batchsphere.core.transactions.grn.entity.MaterialLabel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialLabelRepository extends JpaRepository<MaterialLabel, UUID> {
    List<MaterialLabel> findByGrnContainerIdAndIsActiveTrueOrderByGeneratedAtAsc(UUID grnContainerId);

    List<MaterialLabel> findByGrnContainerIdInAndIsActiveTrueOrderByGeneratedAtAsc(List<UUID> grnContainerIds);
}
