package com.batchsphere.core.lims.reagent.repository;

import com.batchsphere.core.lims.reagent.entity.LabReferenceStandard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabReferenceStandardRepository extends JpaRepository<LabReferenceStandard, UUID> {
    boolean existsByStandardCodeIgnoreCase(String standardCode);
    List<LabReferenceStandard> findByIsActiveTrueOrderByStandardNameAsc();
}
