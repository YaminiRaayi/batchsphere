package com.batchsphere.core.masterdata.supplier.repository;

import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    Optional<Supplier> findBySupplierCode(String supplierCode);

}