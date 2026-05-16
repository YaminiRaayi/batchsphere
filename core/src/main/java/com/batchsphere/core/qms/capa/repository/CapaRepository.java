package com.batchsphere.core.qms.capa.repository;

import com.batchsphere.core.qms.capa.entity.Capa;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CapaRepository extends JpaRepository<Capa, UUID> {

    boolean existsByCapaNumber(String capaNumber);

    Page<Capa> findByIsActiveTrue(Pageable pageable);

    Page<Capa> findByDeviationIdAndIsActiveTrue(UUID deviationId, Pageable pageable);

    List<Capa> findByDeviationIdAndIsActiveTrue(UUID deviationId);

    Optional<Capa> findByIdAndIsActiveTrue(UUID id);

    @Query("select c.status, count(c) from Capa c where c.isActive = true group by c.status")
    List<Object[]> countActiveByStatus();

    long countByIsActiveTrueAndStatusNotAndDueDateBefore(CapaStatus status, LocalDate dueDate);

    long countByIsActiveTrueAndStatusNotAndDueDateBetween(CapaStatus status, LocalDate from, LocalDate to);

    List<Capa> findByIsActiveTrueAndStatusNotAndDueDateBefore(CapaStatus status, LocalDate dueDate);

    List<Capa> findByIsActiveTrueAndStatusNotAndDueDateBetween(CapaStatus status, LocalDate from, LocalDate to);

    List<Capa> findByIsActiveTrueAndStatusNotIn(Collection<CapaStatus> statuses);

    List<Capa> findByIsActiveTrueAndStatus(CapaStatus status);

    long countByIsActiveTrueAndStatusAndEffectivenessReviewDateBefore(CapaStatus status, LocalDate date);

    List<Capa> findByIsActiveTrueAndStatusAndEffectivenessReviewDateBefore(CapaStatus status, LocalDate date);
}
