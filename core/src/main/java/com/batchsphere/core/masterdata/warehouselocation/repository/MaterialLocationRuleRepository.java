package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.MaterialLocationRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaterialLocationRuleRepository extends JpaRepository<MaterialLocationRule, UUID> {

    List<MaterialLocationRule> findByIsActiveTrueOrderByCreatedAtAsc();

    Optional<MaterialLocationRule> findByMaterialIdAndIsActiveTrue(UUID materialId);

    Optional<MaterialLocationRule> findByIdAndIsActiveTrue(UUID id);
}
