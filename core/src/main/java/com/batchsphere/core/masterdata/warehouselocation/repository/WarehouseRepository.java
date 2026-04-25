package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {

    boolean existsByWarehouseCode(String warehouseCode);

    boolean existsByIdAndIsActiveTrue(UUID id);

    boolean existsByBusinessUnitIdAndIsActiveTrue(UUID businessUnitId);

    Page<Warehouse> findByIsActiveTrue(Pageable pageable);

    List<Warehouse> findByIsActiveTrueOrderByWarehouseCodeAsc();
}
