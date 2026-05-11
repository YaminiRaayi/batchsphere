package com.batchsphere.core.masterdata.vendorapproval.repository;

import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface VendorMaterialApprovalRepository extends JpaRepository<VendorMaterialApproval, UUID>,
        JpaSpecificationExecutor<VendorMaterialApproval> {

    Optional<VendorMaterialApproval> findByVendorIdAndVendorBusinessUnitIdAndSupplierIdAndMaterialIdAndIsActiveTrue(
            UUID vendorId,
            UUID vendorBusinessUnitId,
            UUID supplierId,
            UUID materialId
    );
}
