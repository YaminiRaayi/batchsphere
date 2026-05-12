package com.batchsphere.core.qms.deviation.repository;

import com.batchsphere.core.qms.deviation.entity.Deviation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviationRepository extends JpaRepository<Deviation, UUID> {

    boolean existsByDeviationNumber(String deviationNumber);

    Page<Deviation> findByIsActiveTrue(Pageable pageable);

    Optional<Deviation> findByIdAndIsActiveTrue(UUID id);

    @Query("select d.status, count(d) from Deviation d where d.isActive = true group by d.status")
    List<Object[]> countActiveByStatus();

    @Query("select d.severity, count(d) from Deviation d where d.isActive = true group by d.severity")
    List<Object[]> countActiveBySeverity();
}
