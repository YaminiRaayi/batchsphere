package com.batchsphere.core.lims.equipment.repository;

import com.batchsphere.core.lims.equipment.entity.EquipmentQualificationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QualificationRecordRepository extends JpaRepository<EquipmentQualificationRecord, UUID> {

    List<EquipmentQualificationRecord> findByEquipmentIdAndIsActiveTrueOrderByPerformedAtDesc(UUID equipmentId);
}
