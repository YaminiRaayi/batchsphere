package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ShelfRepository extends JpaRepository<Shelf, UUID> {

    boolean existsByRackIdAndShelfCode(UUID rackId, String shelfCode);

    boolean existsByIdAndIsActiveTrue(UUID id);

    boolean existsByRackIdAndIsActiveTrue(UUID rackId);

    Page<Shelf> findByIsActiveTrue(Pageable pageable);

    Page<Shelf> findByRackIdAndIsActiveTrue(UUID rackId, Pageable pageable);

    List<Shelf> findByRackIdInAndIsActiveTrueOrderByShelfCodeAsc(List<UUID> rackIds);
}
