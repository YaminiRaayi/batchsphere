package com.batchsphere.core.masterdata.warehouselocation.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
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
    private final AuthenticatedActorService authenticatedActorService;

    @Override
    public Warehouse createWarehouse(CreateWarehouseRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (warehouseRepository.existsByWarehouseCode(request.getWarehouseCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getWarehouseCode());
        }

        Warehouse warehouse = Warehouse.builder()
                .id(UUID.randomUUID())
                .warehouseCode(request.getWarehouseCode())
                .warehouseName(request.getWarehouseName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .deletedAt(null)
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
        String actor = authenticatedActorService.currentActor();
        Warehouse warehouse = getWarehouseById(id);
        if (!warehouse.getWarehouseCode().equals(request.getWarehouseCode())
                && warehouseRepository.existsByWarehouseCode(request.getWarehouseCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getWarehouseCode());
        }

        warehouse.setWarehouseCode(request.getWarehouseCode());
        warehouse.setWarehouseName(request.getWarehouseName());
        warehouse.setDescription(request.getDescription());
        warehouse.setUpdatedBy(actor);
        warehouse.setUpdatedAt(LocalDateTime.now());
        warehouse.setDeletedAt(null);

        return warehouseRepository.save(warehouse);
    }

    @Override
    public void deactivateWarehouse(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Warehouse warehouse = getWarehouseById(id);
        if (roomRepository.existsByWarehouseIdAndIsActiveTrue(id)) {
            throw new BusinessConflictException("Cannot deactivate warehouse with active rooms");
        }
        warehouse.setIsActive(false);
        warehouse.setUpdatedBy(actor);
        warehouse.setUpdatedAt(LocalDateTime.now());
        warehouse.setDeletedAt(LocalDateTime.now());
        warehouseRepository.save(warehouse);
    }

    @Override
    public Room createRoom(UUID warehouseId, CreateRoomRequest request) {
        String actor = authenticatedActorService.currentActor();
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
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .deletedAt(null)
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
        String actor = authenticatedActorService.currentActor();
        ensureWarehouseExists(warehouseId);
        Room room = getRoomById(id);
        if ((!room.getWarehouseId().equals(warehouseId) || !room.getRoomCode().equals(request.getRoomCode()))
                && roomRepository.existsByWarehouseIdAndRoomCode(warehouseId, request.getRoomCode())) {
            throw new DuplicateResourceException("Room code already exists in warehouse: " + request.getRoomCode());
        }

        room.setWarehouseId(warehouseId);
        room.setRoomCode(request.getRoomCode());
        room.setRoomName(request.getRoomName());
        if (!room.getStorageCondition().equals(request.getStorageCondition()) && rackRepository.existsByRoomIdAndIsActiveTrue(id)) {
            throw new BusinessConflictException("Cannot change room storage condition while active racks exist under the room");
        }
        room.setStorageCondition(request.getStorageCondition());
        room.setDescription(request.getDescription());
        room.setUpdatedBy(actor);
        room.setUpdatedAt(LocalDateTime.now());
        room.setDeletedAt(null);

        return roomRepository.save(room);
    }

    @Override
    public void deactivateRoom(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Room room = getRoomById(id);
        if (rackRepository.existsByRoomIdAndIsActiveTrue(id)) {
            throw new BusinessConflictException("Cannot deactivate room with active racks");
        }
        room.setIsActive(false);
        room.setUpdatedBy(actor);
        room.setUpdatedAt(LocalDateTime.now());
        room.setDeletedAt(LocalDateTime.now());
        roomRepository.save(room);
    }

    @Override
    public Rack createRack(UUID roomId, CreateRackRequest request) {
        String actor = authenticatedActorService.currentActor();
        ensureRoomExists(roomId);
        if (rackRepository.existsByRoomIdAndRackCode(roomId, request.getRackCode())) {
            throw new DuplicateResourceException("Rack code already exists in room: " + request.getRackCode());
        }

        Room room = getRoomById(roomId);

        Rack rack = Rack.builder()
                .id(UUID.randomUUID())
                .warehouseId(room.getWarehouseId())
                .roomId(roomId)
                .rackCode(request.getRackCode())
                .rackName(request.getRackName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .deletedAt(null)
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
        String actor = authenticatedActorService.currentActor();
        ensureRoomExists(roomId);
        Rack rack = getRackById(id);
        Room room = getRoomById(roomId);
        if ((!rack.getRoomId().equals(roomId) || !rack.getRackCode().equals(request.getRackCode()))
                && rackRepository.existsByRoomIdAndRackCode(roomId, request.getRackCode())) {
            throw new DuplicateResourceException("Rack code already exists in room: " + request.getRackCode());
        }

        rack.setWarehouseId(room.getWarehouseId());
        rack.setRoomId(roomId);
        rack.setRackCode(request.getRackCode());
        rack.setRackName(request.getRackName());
        rack.setDescription(request.getDescription());
        rack.setUpdatedBy(actor);
        rack.setUpdatedAt(LocalDateTime.now());
        rack.setDeletedAt(null);

        return rackRepository.save(rack);
    }

    @Override
    public void deactivateRack(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Rack rack = getRackById(id);
        if (shelfRepository.existsByRackIdAndIsActiveTrue(id)) {
            throw new BusinessConflictException("Cannot deactivate rack with active shelves");
        }
        rack.setIsActive(false);
        rack.setUpdatedBy(actor);
        rack.setUpdatedAt(LocalDateTime.now());
        rack.setDeletedAt(LocalDateTime.now());
        rackRepository.save(rack);
    }

    @Override
    public Shelf createShelf(UUID rackId, CreateShelfRequest request) {
        String actor = authenticatedActorService.currentActor();
        ensureRackExists(rackId);
        if (shelfRepository.existsByRackIdAndShelfCode(rackId, request.getShelfCode())) {
            throw new DuplicateResourceException("Shelf code already exists in rack: " + request.getShelfCode());
        }

        Shelf shelf = Shelf.builder()
                .id(UUID.randomUUID())
                .rackId(rackId)
                .shelfCode(request.getShelfCode())
                .shelfName(request.getShelfName())
                .description(request.getDescription())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .deletedAt(null)
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
        String actor = authenticatedActorService.currentActor();
        ensureRackExists(rackId);
        Shelf shelf = getShelfById(id);
        if ((!shelf.getRackId().equals(rackId) || !shelf.getShelfCode().equals(request.getShelfCode()))
                && shelfRepository.existsByRackIdAndShelfCode(rackId, request.getShelfCode())) {
            throw new DuplicateResourceException("Shelf code already exists in rack: " + request.getShelfCode());
        }

        shelf.setRackId(rackId);
        shelf.setShelfCode(request.getShelfCode());
        shelf.setShelfName(request.getShelfName());
        shelf.setDescription(request.getDescription());
        shelf.setUpdatedBy(actor);
        shelf.setUpdatedAt(LocalDateTime.now());
        shelf.setDeletedAt(null);

        return shelfRepository.save(shelf);
    }

    @Override
    public void deactivateShelf(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Shelf shelf = getShelfById(id);
        if (palletRepository.existsByShelfIdAndIsActiveTrue(id)) {
            throw new BusinessConflictException("Cannot deactivate shelf with active pallets");
        }
        shelf.setIsActive(false);
        shelf.setUpdatedBy(actor);
        shelf.setUpdatedAt(LocalDateTime.now());
        shelf.setDeletedAt(LocalDateTime.now());
        shelfRepository.save(shelf);
    }

    @Override
    public Pallet createPallet(UUID shelfId, CreatePalletRequest request) {
        String actor = authenticatedActorService.currentActor();
        ensureShelfExists(shelfId);
        if (palletRepository.existsByShelfIdAndPalletCode(shelfId, request.getPalletCode())) {
            throw new DuplicateResourceException("Pallet code already exists in shelf: " + request.getPalletCode());
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
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .deletedAt(null)
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
        String actor = authenticatedActorService.currentActor();
        ensureShelfExists(shelfId);
        Pallet pallet = getPalletById(id);
        if ((!pallet.getShelfId().equals(shelfId) || !pallet.getPalletCode().equals(request.getPalletCode()))
                && palletRepository.existsByShelfIdAndPalletCode(shelfId, request.getPalletCode())) {
            throw new DuplicateResourceException("Pallet code already exists in shelf: " + request.getPalletCode());
        }

        Room room = getRoomForShelf(shelfId);

        pallet.setShelfId(shelfId);
        pallet.setPalletCode(request.getPalletCode());
        pallet.setPalletName(request.getPalletName());
        pallet.setStorageCondition(room.getStorageCondition());
        pallet.setDescription(request.getDescription());
        pallet.setUpdatedBy(actor);
        pallet.setUpdatedAt(LocalDateTime.now());
        pallet.setDeletedAt(null);

        return palletRepository.save(pallet);
    }

    @Override
    public void deactivatePallet(UUID id) {
        String actor = authenticatedActorService.currentActor();
        Pallet pallet = getPalletById(id);
        pallet.setIsActive(false);
        pallet.setUpdatedBy(actor);
        pallet.setUpdatedAt(LocalDateTime.now());
        pallet.setDeletedAt(LocalDateTime.now());
        palletRepository.save(pallet);
    }

    private void ensureWarehouseExists(UUID warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new ResourceNotFoundException("Warehouse not found with id: " + warehouseId);
        }
        if (!warehouseRepository.existsByIdAndIsActiveTrue(warehouseId)) {
            throw new BusinessConflictException("Warehouse is inactive: " + warehouseId);
        }
    }

    private void ensureRackExists(UUID rackId) {
        if (!rackRepository.existsById(rackId)) {
            throw new ResourceNotFoundException("Rack not found with id: " + rackId);
        }
        if (!rackRepository.existsByIdAndIsActiveTrue(rackId)) {
            throw new BusinessConflictException("Rack is inactive: " + rackId);
        }
    }

    private void ensureRoomExists(UUID roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found with id: " + roomId);
        }
        if (!roomRepository.existsByIdAndIsActiveTrue(roomId)) {
            throw new BusinessConflictException("Room is inactive: " + roomId);
        }
    }

    private void ensureShelfExists(UUID shelfId) {
        if (!shelfRepository.existsById(shelfId)) {
            throw new ResourceNotFoundException("Shelf not found with id: " + shelfId);
        }
        if (!shelfRepository.existsByIdAndIsActiveTrue(shelfId)) {
            throw new BusinessConflictException("Shelf is inactive: " + shelfId);
        }
    }

    private Room getRoomForShelf(UUID shelfId) {
        Shelf shelf = getShelfById(shelfId);
        Rack rack = getRackById(shelf.getRackId());
        return getRoomById(rack.getRoomId());
    }
}
