package com.batchsphere.core.masterdata.warehouselocation.service;

import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.warehouselocation.repository.PalletRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RackRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RoomRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.ShelfRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WarehouseLocationServiceImpl implements WarehouseLocationService {

    private final WarehouseRepository warehouseRepository;
    private final RoomRepository roomRepository;
    private final RackRepository rackRepository;
    private final ShelfRepository shelfRepository;
    private final PalletRepository palletRepository;

    @Override
    public Warehouse createWarehouse(CreateWarehouseRequest request) {
        if (warehouseRepository.existsByWarehouseCode(request.getWarehouseCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getWarehouseCode());
        }

        Warehouse warehouse = Warehouse.builder()
                .id(UUID.randomUUID())
                .warehouseCode(request.getWarehouseCode())
                .warehouseName(request.getWarehouseName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return warehouseRepository.save(warehouse);
    }

    @Override
    public Warehouse getWarehouseById(UUID id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));
    }

    @Override
    public Page<Warehouse> getAllWarehouses(Pageable pageable) {
        return warehouseRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public Warehouse updateWarehouse(UUID id, UpdateWarehouseRequest request) {
        Warehouse warehouse = getWarehouseById(id);
        if (!warehouse.getWarehouseCode().equals(request.getWarehouseCode())
                && warehouseRepository.existsByWarehouseCode(request.getWarehouseCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getWarehouseCode());
        }

        warehouse.setWarehouseCode(request.getWarehouseCode());
        warehouse.setWarehouseName(request.getWarehouseName());
        warehouse.setDescription(request.getDescription());
        warehouse.setUpdatedBy(request.getUpdatedBy());
        warehouse.setUpdatedAt(LocalDateTime.now());

        return warehouseRepository.save(warehouse);
    }

    @Override
    public void deactivateWarehouse(UUID id) {
        Warehouse warehouse = getWarehouseById(id);
        warehouse.setIsActive(false);
        warehouse.setUpdatedAt(LocalDateTime.now());
        warehouseRepository.save(warehouse);
    }

    @Override
    public Room createRoom(UUID warehouseId, CreateRoomRequest request) {
        ensureWarehouseExists(warehouseId);
        if (roomRepository.existsByWarehouseIdAndRoomCode(warehouseId, request.getRoomCode())) {
            throw new DuplicateResourceException("Room code already exists in warehouse: " + request.getRoomCode());
        }

        Room room = Room.builder()
                .id(UUID.randomUUID())
                .warehouseId(warehouseId)
                .roomCode(request.getRoomCode())
                .roomName(request.getRoomName())
                .storageCondition(request.getStorageCondition())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return roomRepository.save(room);
    }

    @Override
    public Room getRoomById(UUID id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
    }

    @Override
    public Page<Room> getAllRooms(UUID warehouseId, Pageable pageable) {
        if (warehouseId != null) {
            return roomRepository.findByWarehouseIdAndIsActiveTrue(warehouseId, pageable);
        }
        return roomRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public Room updateRoom(UUID warehouseId, UUID id, UpdateRoomRequest request) {
        ensureWarehouseExists(warehouseId);
        Room room = getRoomById(id);
        if ((!room.getWarehouseId().equals(warehouseId) || !room.getRoomCode().equals(request.getRoomCode()))
                && roomRepository.existsByWarehouseIdAndRoomCode(warehouseId, request.getRoomCode())) {
            throw new DuplicateResourceException("Room code already exists in warehouse: " + request.getRoomCode());
        }

        room.setWarehouseId(warehouseId);
        room.setRoomCode(request.getRoomCode());
        room.setRoomName(request.getRoomName());
        room.setStorageCondition(request.getStorageCondition());
        room.setDescription(request.getDescription());
        room.setUpdatedBy(request.getUpdatedBy());
        room.setUpdatedAt(LocalDateTime.now());

        return roomRepository.save(room);
    }

    @Override
    public void deactivateRoom(UUID id) {
        Room room = getRoomById(id);
        room.setIsActive(false);
        room.setUpdatedAt(LocalDateTime.now());
        roomRepository.save(room);
    }

    @Override
    public Rack createRack(UUID roomId, CreateRackRequest request) {
        ensureRoomExists(roomId);
        if (rackRepository.existsByRackCode(request.getRackCode())) {
            throw new DuplicateResourceException("Rack code already exists: " + request.getRackCode());
        }

        Rack rack = Rack.builder()
                .id(UUID.randomUUID())
                .roomId(roomId)
                .rackCode(request.getRackCode())
                .rackName(request.getRackName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return rackRepository.save(rack);
    }

    @Override
    public Rack getRackById(UUID id) {
        return rackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rack not found with id: " + id));
    }

    @Override
    public Page<Rack> getAllRacks(UUID roomId, Pageable pageable) {
        if (roomId != null) {
            return rackRepository.findByRoomIdAndIsActiveTrue(roomId, pageable);
        }
        return rackRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public Rack updateRack(UUID roomId, UUID id, UpdateRackRequest request) {
        ensureRoomExists(roomId);
        Rack rack = getRackById(id);
        if (!rack.getRackCode().equals(request.getRackCode())
                && rackRepository.existsByRackCode(request.getRackCode())) {
            throw new DuplicateResourceException("Rack code already exists: " + request.getRackCode());
        }

        rack.setRoomId(roomId);
        rack.setRackCode(request.getRackCode());
        rack.setRackName(request.getRackName());
        rack.setDescription(request.getDescription());
        rack.setUpdatedBy(request.getUpdatedBy());
        rack.setUpdatedAt(LocalDateTime.now());

        return rackRepository.save(rack);
    }

    @Override
    public void deactivateRack(UUID id) {
        Rack rack = getRackById(id);
        rack.setIsActive(false);
        rack.setUpdatedAt(LocalDateTime.now());
        rackRepository.save(rack);
    }

    @Override
    public Shelf createShelf(UUID rackId, CreateShelfRequest request) {
        ensureRackExists(rackId);
        if (shelfRepository.existsByShelfCode(request.getShelfCode())) {
            throw new DuplicateResourceException("Shelf code already exists: " + request.getShelfCode());
        }

        Shelf shelf = Shelf.builder()
                .id(UUID.randomUUID())
                .rackId(rackId)
                .shelfCode(request.getShelfCode())
                .shelfName(request.getShelfName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return shelfRepository.save(shelf);
    }

    @Override
    public Shelf getShelfById(UUID id) {
        return shelfRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shelf not found with id: " + id));
    }

    @Override
    public Page<Shelf> getAllShelves(UUID rackId, Pageable pageable) {
        if (rackId != null) {
            return shelfRepository.findByRackIdAndIsActiveTrue(rackId, pageable);
        }
        return shelfRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public Shelf updateShelf(UUID rackId, UUID id, UpdateShelfRequest request) {
        ensureRackExists(rackId);
        Shelf shelf = getShelfById(id);
        if (!shelf.getShelfCode().equals(request.getShelfCode())
                && shelfRepository.existsByShelfCode(request.getShelfCode())) {
            throw new DuplicateResourceException("Shelf code already exists: " + request.getShelfCode());
        }

        shelf.setRackId(rackId);
        shelf.setShelfCode(request.getShelfCode());
        shelf.setShelfName(request.getShelfName());
        shelf.setDescription(request.getDescription());
        shelf.setUpdatedBy(request.getUpdatedBy());
        shelf.setUpdatedAt(LocalDateTime.now());

        return shelfRepository.save(shelf);
    }

    @Override
    public void deactivateShelf(UUID id) {
        Shelf shelf = getShelfById(id);
        shelf.setIsActive(false);
        shelf.setUpdatedAt(LocalDateTime.now());
        shelfRepository.save(shelf);
    }

    @Override
    public Pallet createPallet(UUID shelfId, CreatePalletRequest request) {
        ensureShelfExists(shelfId);
        if (palletRepository.existsByPalletCode(request.getPalletCode())) {
            throw new DuplicateResourceException("Pallet code already exists: " + request.getPalletCode());
        }

        Room room = getRoomForShelf(shelfId);

        Pallet pallet = Pallet.builder()
                .id(UUID.randomUUID())
                .shelfId(shelfId)
                .palletCode(request.getPalletCode())
                .palletName(request.getPalletName())
                .storageCondition(room.getStorageCondition())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        return palletRepository.save(pallet);
    }

    @Override
    public Pallet getPalletById(UUID id) {
        return palletRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pallet not found with id: " + id));
    }

    @Override
    public Page<Pallet> getAllPallets(UUID shelfId, Pageable pageable) {
        if (shelfId != null) {
            return palletRepository.findByShelfIdAndIsActiveTrue(shelfId, pageable);
        }
        return palletRepository.findByIsActiveTrue(pageable);
    }

    @Override
    public Pallet updatePallet(UUID shelfId, UUID id, UpdatePalletRequest request) {
        ensureShelfExists(shelfId);
        Pallet pallet = getPalletById(id);
        if (!pallet.getPalletCode().equals(request.getPalletCode())
                && palletRepository.existsByPalletCode(request.getPalletCode())) {
            throw new DuplicateResourceException("Pallet code already exists: " + request.getPalletCode());
        }

        Room room = getRoomForShelf(shelfId);

        pallet.setShelfId(shelfId);
        pallet.setPalletCode(request.getPalletCode());
        pallet.setPalletName(request.getPalletName());
        pallet.setStorageCondition(room.getStorageCondition());
        pallet.setDescription(request.getDescription());
        pallet.setUpdatedBy(request.getUpdatedBy());
        pallet.setUpdatedAt(LocalDateTime.now());

        return palletRepository.save(pallet);
    }

    @Override
    public void deactivatePallet(UUID id) {
        Pallet pallet = getPalletById(id);
        pallet.setIsActive(false);
        pallet.setUpdatedAt(LocalDateTime.now());
        palletRepository.save(pallet);
    }

    private void ensureWarehouseExists(UUID warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new ResourceNotFoundException("Warehouse not found with id: " + warehouseId);
        }
    }

    private void ensureRackExists(UUID rackId) {
        if (!rackRepository.existsById(rackId)) {
            throw new ResourceNotFoundException("Rack not found with id: " + rackId);
        }
    }

    private void ensureRoomExists(UUID roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with id: " + roomId);
        }
    }

    private void ensureShelfExists(UUID shelfId) {
        if (!shelfRepository.existsById(shelfId)) {
            throw new ResourceNotFoundException("Shelf not found with id: " + shelfId);
        }
    }

    private Room getRoomForShelf(UUID shelfId) {
        Shelf shelf = getShelfById(shelfId);
        Rack rack = getRackById(shelf.getRackId());
        return getRoomById(rack.getRoomId());
    }
}
