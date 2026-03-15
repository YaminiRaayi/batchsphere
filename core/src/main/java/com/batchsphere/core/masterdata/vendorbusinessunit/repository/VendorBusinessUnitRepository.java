package com.batchsphere.core.masterdata.vendorbusinessunit.repository;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VendorBusinessUnitRepository extends JpaRepository<VendorBusinessUnit, UUID> {

    Page<VendorBusinessUnit> findByIsActiveTrue(Pageable pageable);

    Page<VendorBusinessUnit> findByVendorIdAndIsActiveTrue(UUID vendorId, Pageable pageable);
}
