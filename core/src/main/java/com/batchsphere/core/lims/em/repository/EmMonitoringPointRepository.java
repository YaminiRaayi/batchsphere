package com.batchsphere.core.lims.em.repository;

import com.batchsphere.core.lims.em.entity.EmMonitoringPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmMonitoringPointRepository extends JpaRepository<EmMonitoringPoint, UUID> {
    boolean existsByPointCodeIgnoreCase(String pointCode);
    List<EmMonitoringPoint> findByIsActiveTrueOrderByPointCodeAsc();
}
