package com.batchsphere.core.masterdata.vendor.repository;

import com.batchsphere.core.masterdata.vendor.entity.VendorDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorCorporateDocumentRepository extends JpaRepository<VendorDocument, UUID> {

    List<VendorDocument> findByVendorIdAndIsActiveTrueOrderByUploadedAtDesc(UUID vendorId);

    Optional<VendorDocument> findByIdAndVendorIdAndIsActiveTrue(UUID id, UUID vendorId);
}
