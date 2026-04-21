package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RackRepository extends JpaRepository<Rack, UUID> {

    boolean existsByRoomIdAndRackCode(UUID roomId, String rackCode);

    boolean existsByIdAndIsActiveTrue(UUID id);

    boolean existsByRoomIdAndIsActiveTrue(UUID roomId);

    Page<Rack> findByIsActiveTrue(Pageable pageable);

    Page<Rack> findByRoomIdAndIsActiveTrue(UUID roomId, Pageable pageable);

    List<Rack> findByRoomIdInAndIsActiveTrueOrderByRackCodeAsc(List<UUID> roomIds);
}
