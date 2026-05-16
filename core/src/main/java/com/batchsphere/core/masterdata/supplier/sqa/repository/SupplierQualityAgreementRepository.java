package com.batchsphere.core.masterdata.supplier.sqa.repository;

import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreement;
import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierQualityAgreementRepository extends JpaRepository<SupplierQualityAgreement, UUID> {
    boolean existsBySqaNumber(String sqaNumber);
    Optional<SupplierQualityAgreement> findByIdAndIsActiveTrue(UUID id);
    Page<SupplierQualityAgreement> findByIsActiveTrue(Pageable pageable);
    Page<SupplierQualityAgreement> findBySupplierIdAndIsActiveTrue(UUID supplierId, Pageable pageable);
    Page<SupplierQualityAgreement> findByStatusAndIsActiveTrue(SupplierQualityAgreementStatus status, Pageable pageable);
    Page<SupplierQualityAgreement> findBySupplierIdAndStatusAndIsActiveTrue(UUID supplierId, SupplierQualityAgreementStatus status, Pageable pageable);
    List<SupplierQualityAgreement> findBySupplierIdAndIsActiveTrueOrderByCreatedAtDesc(UUID supplierId);
    List<SupplierQualityAgreement> findByStatusAndExpiryDateLessThanEqualAndIsActiveTrue(SupplierQualityAgreementStatus status, LocalDate expiryDate);
    boolean existsBySupplierIdAndStatusAndIsActiveTrue(UUID supplierId, SupplierQualityAgreementStatus status);
}
