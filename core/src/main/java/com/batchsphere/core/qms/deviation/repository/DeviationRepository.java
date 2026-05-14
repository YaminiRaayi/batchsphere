package com.batchsphere.core.qms.deviation.repository;

import com.batchsphere.core.qms.deviation.entity.Deviation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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

    @Query("select d.sourceModule, count(d) from Deviation d where d.isActive = true group by d.sourceModule")
    List<Object[]> countActiveBySourceModule();

    @Query(value = "select to_char(detected_at, 'YYYY-MM') as month, count(*) as cnt from qms_deviation where is_active = true and detected_at >= :since group by 1 order by 1", nativeQuery = true)
    List<Object[]> countByMonthSince(@Param("since") LocalDateTime since);
}
