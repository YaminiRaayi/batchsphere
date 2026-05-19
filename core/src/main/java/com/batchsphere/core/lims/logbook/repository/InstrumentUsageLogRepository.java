package com.batchsphere.core.lims.logbook.repository;

import com.batchsphere.core.lims.logbook.entity.InstrumentUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface InstrumentUsageLogRepository extends JpaRepository<InstrumentUsageLog, UUID> {
    List<InstrumentUsageLog> findByEquipmentIdAndIsActiveTrueOrderByUsedAtDesc(UUID equipmentId);
    List<InstrumentUsageLog> findByUsedAtBetweenAndIsActiveTrueOrderByUsedAtDesc(LocalDateTime from, LocalDateTime to);
    List<InstrumentUsageLog> findByUsedByIgnoreCaseAndIsActiveTrueOrderByUsedAtDesc(String usedBy);
    List<InstrumentUsageLog> findAllByIsActiveTrueOrderByUsedAtDesc();
}
