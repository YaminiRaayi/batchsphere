package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RackRepository extends JpaRepository<Rack, UUID> {

    boolean existsByRackCode(String rackCode);

    Page<Rack> findByIsActiveTrue(Pageable pageable);

    Page<Rack> findByRoomIdAndIsActiveTrue(UUID roomId, Pageable pageable);
}
