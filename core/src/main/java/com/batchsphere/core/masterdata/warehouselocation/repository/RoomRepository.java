package com.batchsphere.core.masterdata.warehouselocation.repository;

import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RoomRepository extends JpaRepository<Room, UUID> {

    boolean existsByWarehouseIdAndRoomCode(UUID warehouseId, String roomCode);

    boolean existsByIdAndIsActiveTrue(UUID id);

    boolean existsByWarehouseIdAndIsActiveTrue(UUID warehouseId);

    Page<Room> findByIsActiveTrue(Pageable pageable);

    Page<Room> findByWarehouseIdAndIsActiveTrue(UUID warehouseId, Pageable pageable);
}
