package com.batchsphere.core.lims.reagent.repository;

import com.batchsphere.core.lims.reagent.entity.LabReferenceStandardLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LabReferenceStandardLotRepository extends JpaRepository<LabReferenceStandardLot, UUID> {
    List<LabReferenceStandardLot> findByStandardIdAndIsActiveTrueOrderByExpiryDateAsc(UUID standardId);
    List<LabReferenceStandardLot> findByExpiryDateBetweenAndIsActiveTrueOrderByExpiryDateAsc(LocalDate from, LocalDate to);
    long countByExpiryDateBetweenAndIsActiveTrue(LocalDate from, LocalDate to);
}
