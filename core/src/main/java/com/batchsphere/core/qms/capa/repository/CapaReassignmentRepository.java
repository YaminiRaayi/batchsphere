package com.batchsphere.core.qms.capa.repository;

import com.batchsphere.core.qms.capa.entity.CapaReassignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CapaReassignmentRepository extends JpaRepository<CapaReassignment, UUID> {
    List<CapaReassignment> findByCapaIdOrderByAssignedAtDesc(UUID capaId);
}
