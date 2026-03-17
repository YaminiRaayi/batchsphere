package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ShelfRepository extends JpaRepository<Shelf, UUID> {

    boolean existsByShelfCode(String shelfCode);

    Page<Shelf> findByIsActiveTrue(Pageable pageable);

    Page<Shelf> findByRackIdAndIsActiveTrue(UUID rackId, Pageable pageable);
}
