package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.warehouselocation.entity.WarehouseZoneRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WarehouseZoneRuleRepository extends JpaRepository<WarehouseZoneRule, UUID> {

    List<WarehouseZoneRule> findByIsActiveTrueOrderByZoneNameAsc();

    List<WarehouseZoneRule> findByRoomIdAndIsActiveTrueOrderByZoneNameAsc(UUID roomId);

    boolean existsByRoomIdAndZoneNameAndAllowedMaterialTypeAndAllowedStorageConditionAndIsActiveTrue(
            UUID roomId,
            String zoneName,
            String allowedMaterialType,
            StorageCondition allowedStorageCondition
    );

    Optional<WarehouseZoneRule> findByIdAndIsActiveTrue(UUID id);
}
