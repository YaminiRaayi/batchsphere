package com.batchsphere.core.lims.equipment.repository;

import com.batchsphere.core.lims.equipment.entity.Equipment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EquipmentRepository extends JpaRepository<Equipment, UUID> {

    boolean existsByEquipmentId(String equipmentId);

    List<Equipment> findByIsActiveTrueAndStatus(com.batchsphere.core.lims.equipment.entity.EquipmentStatus status);

    Page<Equipment> findByIsActiveTrue(Pageable pageable);

    Optional<Equipment> findByIdAndIsActiveTrue(UUID id);

    List<Equipment> findByIsActiveTrueAndNextCalibrationDueBefore(LocalDate date);

    List<Equipment> findByIsActiveTrueAndNextQualificationDueBefore(LocalDate date);

    @Query("select e from Equipment e where e.isActive = true and e.nextCalibrationDue >= :from and e.nextCalibrationDue <= :to and e.status <> com.batchsphere.core.lims.equipment.entity.EquipmentStatus.RETIRED")
    List<Equipment> findCalibrationDueSoon(@org.springframework.data.repository.query.Param("from") LocalDate from, @org.springframework.data.repository.query.Param("to") LocalDate to);

    @Query("select e from Equipment e where e.isActive = true and e.nextQualificationDue >= :from and e.nextQualificationDue <= :to and e.status <> com.batchsphere.core.lims.equipment.entity.EquipmentStatus.RETIRED")
    List<Equipment> findQualificationDueSoon(@org.springframework.data.repository.query.Param("from") LocalDate from, @org.springframework.data.repository.query.Param("to") LocalDate to);

    @Query("select e.status, count(e) from Equipment e where e.isActive = true group by e.status")
    List<Object[]> countActiveByStatus();
}
