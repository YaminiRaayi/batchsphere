package com.batchsphere.core.masterdata.vendorbusinessunit.repository;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorAuditRepository extends JpaRepository<VendorAudit, UUID> {

    List<VendorAudit> findByBuIdAndIsActiveTrueOrderByScheduledDateDescCreatedAtDesc(UUID buId);

    Optional<VendorAudit> findByIdAndBuIdAndIsActiveTrue(UUID id, UUID buId);
}
