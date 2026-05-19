package com.batchsphere.core.lims.reagent.repository;

import com.batchsphere.core.lims.reagent.entity.LabReagent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabReagentRepository extends JpaRepository<LabReagent, UUID> {
    boolean existsByReagentCodeIgnoreCase(String reagentCode);
    List<LabReagent> findByIsActiveTrueOrderByReagentNameAsc();
}
