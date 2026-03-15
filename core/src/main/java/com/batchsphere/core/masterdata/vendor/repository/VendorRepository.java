package com.batchsphere.core.masterdata.vendor.repository;

import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VendorRepository extends JpaRepository<Vendor, UUID> {

    Optional<Vendor> findByVendorCode(String vendorCode);

    boolean existsByVendorCode(String vendorCode);

    Page<Vendor> findByIsActiveTrue(Pageable pageable);

}
