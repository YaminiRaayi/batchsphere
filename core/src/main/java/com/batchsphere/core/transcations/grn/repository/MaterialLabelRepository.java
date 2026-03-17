package com.batchsphere.core.transcations.grn.repository;

import com.batchsphere.core.transcations.grn.entity.MaterialLabel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialLabelRepository extends JpaRepository<MaterialLabel, UUID> {
    List<MaterialLabel> findByGrnContainerIdAndIsActiveTrue(UUID grnContainerId);
}
