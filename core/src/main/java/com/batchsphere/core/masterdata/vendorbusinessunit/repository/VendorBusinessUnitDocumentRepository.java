package com.batchsphere.core.masterdata.vendorbusinessunit.repository;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorBusinessUnitDocumentRepository extends JpaRepository<VendorDocument, UUID> {

    List<VendorDocument> findByBuIdAndIsActiveTrueOrderByUploadedAtDesc(UUID buId);

    Optional<VendorDocument> findByIdAndBuIdAndIsActiveTrue(UUID id, UUID buId);
}
