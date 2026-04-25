package com.batchsphere.core.masterdata.businessunit.repository;

import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BusinessUnitRepository extends JpaRepository<BusinessUnit, UUID> {

    boolean existsByUnitCode(String unitCode);

    boolean existsByIdAndIsActiveTrue(UUID id);

    Page<BusinessUnit> findByIsActiveTrue(Pageable pageable);

    List<BusinessUnit> findByIdInAndIsActiveTrue(List<UUID> ids);
}
