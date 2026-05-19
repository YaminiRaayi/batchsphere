package com.batchsphere.core.lims.reagent.repository;

import com.batchsphere.core.lims.reagent.entity.LabReagentLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LabReagentLotRepository extends JpaRepository<LabReagentLot, UUID> {
    List<LabReagentLot> findByReagentIdAndIsActiveTrueOrderByExpiryDateAsc(UUID reagentId);
    List<LabReagentLot> findByExpiryDateBetweenAndIsActiveTrueOrderByExpiryDateAsc(LocalDate from, LocalDate to);
    List<LabReagentLot> findByIsActiveTrueOrderByExpiryDateAsc();
    long countByExpiryDateBetweenAndIsActiveTrue(LocalDate from, LocalDate to);
}
