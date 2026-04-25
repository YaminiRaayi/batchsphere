package com.batchsphere.core.masterdata.warehouselocation.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import com.batchsphere.core.masterdata.businessunit.repository.BusinessUnitRepository;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateWarehouseZoneRuleRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateMaterialLocationRuleRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.AvailablePalletResponse;
import com.batchsphere.core.masterdata.warehouselocation.dto.MaterialLocationRuleResponse;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateWarehouseZoneRuleRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateMaterialLocationRuleRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.WarehouseHierarchyResponse;
import com.batchsphere.core.masterdata.warehouselocation.dto.WarehouseZoneRuleResponse;
import com.batchsphere.core.masterdata.warehouselocation.dto.WmsSummaryResponse;
import com.batchsphere.core.masterdata.warehouselocation.entity.MaterialLocationRule;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.warehouselocation.entity.WarehouseZoneRule;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.MaterialLocationRuleRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.PalletRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RackRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RoomRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.ShelfRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseZoneRuleRepository;
import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    private final InventoryRepository inventoryRepository;
    private final GrnItemRepository grnItemRepository;
    private final WarehouseZoneRuleRepository warehouseZoneRuleRepository;
    private final MaterialLocationRuleRepository materialLocationRuleRepository;
    private final MaterialRepository materialRepository;
    private final BatchRepository batchRepository;
    private final BusinessUnitRepository businessUnitRepository;

    @Override
    public Warehouse createWarehouse(CreateWarehouseRequest request) {
        String actor = authenticatedActorService.currentActor();
        if (warehouseRepository.existsByWarehouseCode(request.getWarehouseCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getWarehouseCode());
        }
        ensureBusinessUnitExists(request.getBusinessUnitId());

        Warehouse warehouse = Warehouse.builder()
                .id(UUID.randomUUID())
                .warehouseCode(request.getWarehouseCode())
                .warehouseName(request.getWarehouseName())
                .businessUnitId(request.getBusinessUnitId())
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
    public List<WarehouseHierarchyResponse> getWarehouseTree() {
        List<Warehouse> warehouses = warehouseRepository.findByIsActiveTrueOrderByWarehouseCodeAsc();
        Map<UUID, BusinessUnit> businessUnitById = businessUnitRepository.findByIdInAndIsActiveTrue(
                warehouses.stream()
                        .map(Warehouse::getBusinessUnitId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList()
        ).stream().collect(java.util.stream.Collectors.toMap(BusinessUnit::getId, businessUnit -> businessUnit));
        List<UUID> warehouseIds = warehouses.stream().map(Warehouse::getId).toList();
        if (warehouseIds.isEmpty()) {
            return List.of();
        }

        List<Room> rooms = roomRepository.findByWarehouseIdInAndIsActiveTrueOrderByRoomCodeAsc(warehouseIds);
        List<UUID> roomIds = rooms.stream().map(Room::getId).toList();
        List<Rack> racks = roomIds.isEmpty() ? List.of() : rackRepository.findByRoomIdInAndIsActiveTrueOrderByRackCodeAsc(roomIds);
        List<UUID> rackIds = racks.stream().map(Rack::getId).toList();
        List<Shelf> shelves = rackIds.isEmpty() ? List.of() : shelfRepository.findByRackIdInAndIsActiveTrueOrderByShelfCodeAsc(rackIds);
        List<UUID> shelfIds = shelves.stream().map(Shelf::getId).toList();
        List<Pallet> pallets = shelfIds.isEmpty() ? List.of() : palletRepository.findByShelfIdInAndIsActiveTrueOrderByPalletCodeAsc(shelfIds);

        Map<UUID, List<Pallet>> palletsByShelfId = new HashMap<>();
        for (Pallet pallet : pallets) {
            palletsByShelfId.computeIfAbsent(pallet.getShelfId(), key -> new ArrayList<>()).add(pallet);
        }

        Map<UUID, List<Shelf>> shelvesByRackId = new HashMap<>();
        for (Shelf shelf : shelves) {
            shelvesByRackId.computeIfAbsent(shelf.getRackId(), key -> new ArrayList<>()).add(shelf);
        }

        Map<UUID, List<Rack>> racksByRoomId = new HashMap<>();
        for (Rack rack : racks) {
            racksByRoomId.computeIfAbsent(rack.getRoomId(), key -> new ArrayList<>()).add(rack);
        }

        Map<UUID, List<Room>> roomsByWarehouseId = new HashMap<>();
        for (Room room : rooms) {
            roomsByWarehouseId.computeIfAbsent(room.getWarehouseId(), key -> new ArrayList<>()).add(room);
        }

        return warehouses.stream()
                .map(warehouse -> WarehouseHierarchyResponse.builder()
                        .id(warehouse.getId())
                        .warehouseCode(warehouse.getWarehouseCode())
                        .warehouseName(warehouse.getWarehouseName())
                        .businessUnitId(warehouse.getBusinessUnitId())
                        .businessUnitCode(businessUnitById.get(warehouse.getBusinessUnitId()) != null ? businessUnitById.get(warehouse.getBusinessUnitId()).getUnitCode() : null)
                        .businessUnitName(businessUnitById.get(warehouse.getBusinessUnitId()) != null ? businessUnitById.get(warehouse.getBusinessUnitId()).getUnitName() : null)
                        .rooms(roomsByWarehouseId.getOrDefault(warehouse.getId(), List.of()).stream()
                                .map(room -> WarehouseHierarchyResponse.RoomNode.builder()
                                        .id(room.getId())
                                        .roomCode(room.getRoomCode())
                                        .roomName(room.getRoomName())
                                        .storageCondition(room.getStorageCondition())
                                        .maxCapacity(room.getMaxCapacity())
                                        .capacityUom(room.getCapacityUom())
                                        .temperatureRange(room.getTemperatureRange())
                                        .humidityRange(room.getHumidityRange())
                                        .racks(racksByRoomId.getOrDefault(room.getId(), List.of()).stream()
                                                .map(rack -> WarehouseHierarchyResponse.RackNode.builder()
                                                        .id(rack.getId())
                                                        .rackCode(rack.getRackCode())
                                                        .rackName(rack.getRackName())
                                                        .shelves(shelvesByRackId.getOrDefault(rack.getId(), List.of()).stream()
                                                                .map(shelf -> WarehouseHierarchyResponse.ShelfNode.builder()
                                                                        .id(shelf.getId())
                                                                        .shelfCode(shelf.getShelfCode())
                                                                        .shelfName(shelf.getShelfName())
                                                                        .pallets(palletsByShelfId.getOrDefault(shelf.getId(), List.of()).stream()
                                                                                .map(pallet -> WarehouseHierarchyResponse.PalletNode.builder()
                                                                                        .id(pallet.getId())
                                                                                        .palletCode(pallet.getPalletCode())
                                                                                        .palletName(pallet.getPalletName())
                                                                                        .storageCondition(pallet.getStorageCondition())
                                                                                        .build())
                                                                                .toList())
                                                                        .build())
                                                                .toList())
                                                        .build())
                                                .toList())
                                        .build())
                                .toList())
                        .build())
                .toList();
    }

    @Override
    public Warehouse updateWarehouse(UUID id, UpdateWarehouseRequest request) {
        String actor = authenticatedActorService.currentActor();
        Warehouse warehouse = getWarehouseById(id);
        if (!warehouse.getWarehouseCode().equals(request.getWarehouseCode())
                && warehouseRepository.existsByWarehouseCode(request.getWarehouseCode())) {
            throw new DuplicateResourceException("Warehouse code already exists: " + request.getWarehouseCode());
        }
        ensureBusinessUnitExists(request.getBusinessUnitId());

        warehouse.setWarehouseCode(request.getWarehouseCode());
        warehouse.setWarehouseName(request.getWarehouseName());
        warehouse.setBusinessUnitId(request.getBusinessUnitId());
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
                .maxCapacity(request.getMaxCapacity())
                .capacityUom(request.getCapacityUom())
                .temperatureRange(request.getTemperatureRange())
                .humidityRange(request.getHumidityRange())
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
        room.setMaxCapacity(request.getMaxCapacity());
        room.setCapacityUom(request.getCapacityUom());
        room.setTemperatureRange(request.getTemperatureRange());
        room.setHumidityRange(request.getHumidityRange());
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
    public List<AvailablePalletResponse> getAvailablePallets(com.batchsphere.core.masterdata.material.entity.StorageCondition storageCondition) {
        List<Pallet> pallets = palletRepository.findByIsActiveTrueOrderByPalletCodeAsc();
        if (storageCondition != null) {
            pallets = pallets.stream()
                    .filter(pallet -> pallet.getStorageCondition() == storageCondition)
                    .toList();
        }

        List<UUID> occupiedPalletIds = getOccupiedPalletIds(pallets.stream().map(Pallet::getId).toList());
        if (!occupiedPalletIds.isEmpty()) {
            pallets = pallets.stream()
                    .filter(pallet -> !occupiedPalletIds.contains(pallet.getId()))
                    .toList();
        }

        if (pallets.isEmpty()) {
            return List.of();
        }

        Map<UUID, Shelf> shelfById = shelfRepository.findAllById(pallets.stream().map(Pallet::getShelfId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(Shelf::getId, shelf -> shelf));
        Map<UUID, Rack> rackById = rackRepository.findAllById(shelfById.values().stream().map(Shelf::getRackId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(Rack::getId, rack -> rack));
        Map<UUID, Room> roomById = roomRepository.findAllById(rackById.values().stream().map(Rack::getRoomId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(Room::getId, room -> room));
        Map<UUID, Warehouse> warehouseById = warehouseRepository.findAllById(roomById.values().stream().map(Room::getWarehouseId).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(Warehouse::getId, warehouse -> warehouse));

        return pallets.stream()
                .map(pallet -> {
                    Shelf shelf = shelfById.get(pallet.getShelfId());
                    Rack rack = rackById.get(shelf.getRackId());
                    Room room = roomById.get(rack.getRoomId());
                    Warehouse warehouse = warehouseById.get(room.getWarehouseId());
                    return AvailablePalletResponse.builder()
                            .palletId(pallet.getId())
                            .palletCode(pallet.getPalletCode())
                            .palletName(pallet.getPalletName())
                            .shelfId(shelf.getId())
                            .shelfCode(shelf.getShelfCode())
                            .rackId(rack.getId())
                            .rackCode(rack.getRackCode())
                            .roomId(room.getId())
                            .roomCode(room.getRoomCode())
                            .warehouseId(warehouse.getId())
                            .warehouseCode(warehouse.getWarehouseCode())
                            .storageCondition(pallet.getStorageCondition())
                            .build();
                })
                .toList();
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
        ensurePalletNotInUse(id);
        pallet.setIsActive(false);
        pallet.setUpdatedBy(actor);
        pallet.setUpdatedAt(LocalDateTime.now());
        pallet.setDeletedAt(LocalDateTime.now());
        palletRepository.save(pallet);
    }

    @Override
    public WmsSummaryResponse getWmsSummary() {
        List<Warehouse> warehouses = warehouseRepository.findByIsActiveTrueOrderByWarehouseCodeAsc();
        Map<UUID, BusinessUnit> businessUnitById = businessUnitRepository.findByIdInAndIsActiveTrue(
                warehouses.stream()
                        .map(Warehouse::getBusinessUnitId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList()
        ).stream().collect(java.util.stream.Collectors.toMap(BusinessUnit::getId, businessUnit -> businessUnit));
        List<Room> rooms = roomRepository.findAll().stream()
                .filter(Room::getIsActive)
                .sorted(Comparator.comparing(Room::getRoomCode))
                .toList();
        List<Rack> racks = rackRepository.findAll().stream()
                .filter(Rack::getIsActive)
                .sorted(Comparator.comparing(Rack::getRackCode))
                .toList();
        List<Shelf> shelves = shelfRepository.findAll().stream()
                .filter(Shelf::getIsActive)
                .sorted(Comparator.comparing(Shelf::getShelfCode))
                .toList();
        List<Pallet> pallets = palletRepository.findByIsActiveTrueOrderByPalletCodeAsc();
        List<Inventory> inventories = inventoryRepository.findByIsActiveTrue();
        List<Batch> batches = batchRepository.findByIsActiveTrue();
        List<WarehouseZoneRuleResponse> zoneRules = getZoneRules(null);
        List<MaterialLocationRuleResponse> materialLocations = getMaterialLocationRules(null);

        Map<UUID, List<Rack>> racksByRoomId = new HashMap<>();
        for (Rack rack : racks) {
            racksByRoomId.computeIfAbsent(rack.getRoomId(), key -> new ArrayList<>()).add(rack);
        }
        Map<UUID, List<Shelf>> shelvesByRackId = new HashMap<>();
        for (Shelf shelf : shelves) {
            shelvesByRackId.computeIfAbsent(shelf.getRackId(), key -> new ArrayList<>()).add(shelf);
        }
        Map<UUID, List<Pallet>> palletsByShelfId = new HashMap<>();
        for (Pallet pallet : pallets) {
            palletsByShelfId.computeIfAbsent(pallet.getShelfId(), key -> new ArrayList<>()).add(pallet);
        }
        Map<UUID, Shelf> shelfById = shelves.stream().collect(java.util.stream.Collectors.toMap(Shelf::getId, shelf -> shelf));
        Map<UUID, Rack> rackById = racks.stream().collect(java.util.stream.Collectors.toMap(Rack::getId, rack -> rack));
        Map<UUID, Batch> batchById = batches.stream().collect(java.util.stream.Collectors.toMap(Batch::getId, batch -> batch));

        Map<UUID, BigDecimal> roomLoadByRoomId = new HashMap<>();
        Map<UUID, HashSet<UUID>> roomLotsByRoomId = new HashMap<>();
        for (Inventory inventory : inventories) {
            Shelf shelf = shelfById.get(getPalletById(inventory.getPalletId()).getShelfId());
            if (shelf == null) {
                continue;
            }
            Rack rack = rackById.get(shelf.getRackId());
            if (rack == null) {
                continue;
            }
            roomLoadByRoomId.merge(rack.getRoomId(), inventory.getQuantityOnHand(), BigDecimal::add);
            Batch batch = batchById.get(inventory.getBatchId());
            if (batch != null) {
                roomLotsByRoomId.computeIfAbsent(rack.getRoomId(), key -> new HashSet<>()).add(batch.getId());
            }
        }

        List<WmsSummaryResponse.WarehouseSummary> warehouseSummaries = warehouses.stream()
                .map(warehouse -> {
                    List<Room> warehouseRooms = rooms.stream().filter(room -> room.getWarehouseId().equals(warehouse.getId())).toList();
                    long rackCount = warehouseRooms.stream().mapToLong(room -> racksByRoomId.getOrDefault(room.getId(), List.of()).size()).sum();
                    long shelfCount = warehouseRooms.stream()
                            .flatMap(room -> racksByRoomId.getOrDefault(room.getId(), List.of()).stream())
                            .mapToLong(rack -> shelvesByRackId.getOrDefault(rack.getId(), List.of()).size())
                            .sum();
                    long palletCount = warehouseRooms.stream()
                            .flatMap(room -> racksByRoomId.getOrDefault(room.getId(), List.of()).stream())
                            .flatMap(rack -> shelvesByRackId.getOrDefault(rack.getId(), List.of()).stream())
                            .mapToLong(shelf -> palletsByShelfId.getOrDefault(shelf.getId(), List.of()).size())
                            .sum();
                    return WmsSummaryResponse.WarehouseSummary.builder()
                            .warehouseId(warehouse.getId())
                            .businessUnitId(warehouse.getBusinessUnitId())
                            .businessUnitCode(businessUnitById.get(warehouse.getBusinessUnitId()) != null ? businessUnitById.get(warehouse.getBusinessUnitId()).getUnitCode() : null)
                            .businessUnitName(businessUnitById.get(warehouse.getBusinessUnitId()) != null ? businessUnitById.get(warehouse.getBusinessUnitId()).getUnitName() : null)
                            .warehouseCode(warehouse.getWarehouseCode())
                            .warehouseName(warehouse.getWarehouseName())
                            .roomCount(warehouseRooms.size())
                            .rackCount(rackCount)
                            .shelfCount(shelfCount)
                            .palletCount(palletCount)
                            .build();
                })
                .toList();

        List<WmsSummaryResponse.RoomSummary> roomSummaries = rooms.stream()
                .map(room -> {
                    List<Rack> roomRacks = racksByRoomId.getOrDefault(room.getId(), List.of());
                    long shelfCount = roomRacks.stream().mapToLong(rack -> shelvesByRackId.getOrDefault(rack.getId(), List.of()).size()).sum();
                    long palletCount = roomRacks.stream()
                            .flatMap(rack -> shelvesByRackId.getOrDefault(rack.getId(), List.of()).stream())
                            .mapToLong(shelf -> palletsByShelfId.getOrDefault(shelf.getId(), List.of()).size())
                            .sum();
                    BigDecimal currentLoad = roomLoadByRoomId.getOrDefault(room.getId(), BigDecimal.ZERO);
                    BigDecimal occupancyPercent = room.getMaxCapacity() != null
                            && room.getMaxCapacity().compareTo(BigDecimal.ZERO) > 0
                            ? currentLoad.multiply(BigDecimal.valueOf(100)).divide(room.getMaxCapacity(), 2, java.math.RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    Warehouse warehouse = warehouses.stream().filter(entry -> entry.getId().equals(room.getWarehouseId())).findFirst().orElse(null);
                    BusinessUnit businessUnit = warehouse != null && warehouse.getBusinessUnitId() != null
                            ? businessUnitById.get(warehouse.getBusinessUnitId())
                            : null;
                    return WmsSummaryResponse.RoomSummary.builder()
                            .roomId(room.getId())
                            .warehouseId(room.getWarehouseId())
                            .businessUnitId(warehouse != null ? warehouse.getBusinessUnitId() : null)
                            .businessUnitCode(businessUnit != null ? businessUnit.getUnitCode() : null)
                            .businessUnitName(businessUnit != null ? businessUnit.getUnitName() : null)
                            .warehouseCode(warehouse != null ? warehouse.getWarehouseCode() : null)
                            .roomCode(room.getRoomCode())
                            .roomName(room.getRoomName())
                            .storageCondition(room.getStorageCondition())
                            .maxCapacity(room.getMaxCapacity())
                            .capacityUom(room.getCapacityUom())
                            .temperatureRange(room.getTemperatureRange())
                            .humidityRange(room.getHumidityRange())
                            .currentLoad(currentLoad)
                            .currentLots(roomLotsByRoomId.getOrDefault(room.getId(), new HashSet<>()).size())
                            .activePallets(palletCount)
                            .totalPallets(palletCount)
                            .rackCount(roomRacks.size())
                            .shelfCount(shelfCount)
                            .occupancyPercent(occupancyPercent)
                            .build();
                })
                .toList();

        return WmsSummaryResponse.builder()
                .warehouses(warehouseSummaries)
                .rooms(roomSummaries)
                .zoneRules(zoneRules)
                .materialLocations(materialLocations)
                .build();
    }

    @Override
    public List<WarehouseZoneRuleResponse> getZoneRules(UUID roomId) {
        List<WarehouseZoneRule> rules = roomId == null
                ? warehouseZoneRuleRepository.findByIsActiveTrueOrderByZoneNameAsc()
                : warehouseZoneRuleRepository.findByRoomIdAndIsActiveTrueOrderByZoneNameAsc(roomId);
        Map<UUID, Room> roomsById = roomRepository.findAllById(rules.stream().map(WarehouseZoneRule::getRoomId).distinct().toList())
                .stream().collect(java.util.stream.Collectors.toMap(Room::getId, room -> room));
        return rules.stream().map(rule -> toZoneRuleResponse(rule, roomsById.get(rule.getRoomId()))).toList();
    }

    @Override
    public WarehouseZoneRuleResponse createZoneRule(CreateWarehouseZoneRuleRequest request) {
        String actor = authenticatedActorService.currentActor();
        ensureRoomExists(request.getRoomId());
        if (warehouseZoneRuleRepository.existsByRoomIdAndZoneNameAndAllowedMaterialTypeAndAllowedStorageConditionAndIsActiveTrue(
                request.getRoomId(),
                request.getZoneName(),
                request.getAllowedMaterialType(),
                request.getAllowedStorageCondition()
        )) {
            throw new DuplicateResourceException("Zone rule already exists for room: " + request.getZoneName());
        }

        WarehouseZoneRule rule = WarehouseZoneRule.builder()
                .id(UUID.randomUUID())
                .roomId(request.getRoomId())
                .zoneName(request.getZoneName())
                .allowedMaterialType(request.getAllowedMaterialType())
                .allowedStorageCondition(request.getAllowedStorageCondition())
                .restrictedAccess(Boolean.TRUE.equals(request.getRestrictedAccess()))
                .quarantineOnly(Boolean.TRUE.equals(request.getQuarantineOnly()))
                .rejectedOnly(Boolean.TRUE.equals(request.getRejectedOnly()))
                .notes(request.getNotes())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();
        WarehouseZoneRule saved = warehouseZoneRuleRepository.save(rule);
        return toZoneRuleResponse(saved, getRoomById(saved.getRoomId()));
    }

    @Override
    public WarehouseZoneRuleResponse updateZoneRule(UUID id, UpdateWarehouseZoneRuleRequest request) {
        String actor = authenticatedActorService.currentActor();
        WarehouseZoneRule rule = getActiveZoneRule(id);
        ensureRoomExists(request.getRoomId());
        if ((!rule.getRoomId().equals(request.getRoomId())
                || !Objects.equals(rule.getZoneName(), request.getZoneName())
                || !Objects.equals(rule.getAllowedMaterialType(), request.getAllowedMaterialType())
                || !Objects.equals(rule.getAllowedStorageCondition(), request.getAllowedStorageCondition()))
                && warehouseZoneRuleRepository.existsByRoomIdAndZoneNameAndAllowedMaterialTypeAndAllowedStorageConditionAndIsActiveTrue(
                request.getRoomId(),
                request.getZoneName(),
                request.getAllowedMaterialType(),
                request.getAllowedStorageCondition()
        )) {
            throw new DuplicateResourceException("Zone rule already exists for room: " + request.getZoneName());
        }
        rule.setRoomId(request.getRoomId());
        rule.setZoneName(request.getZoneName());
        rule.setAllowedMaterialType(request.getAllowedMaterialType());
        rule.setAllowedStorageCondition(request.getAllowedStorageCondition());
        rule.setRestrictedAccess(Boolean.TRUE.equals(request.getRestrictedAccess()));
        rule.setQuarantineOnly(Boolean.TRUE.equals(request.getQuarantineOnly()));
        rule.setRejectedOnly(Boolean.TRUE.equals(request.getRejectedOnly()));
        rule.setNotes(request.getNotes());
        rule.setUpdatedBy(actor);
        rule.setUpdatedAt(LocalDateTime.now());
        WarehouseZoneRule saved = warehouseZoneRuleRepository.save(rule);
        return toZoneRuleResponse(saved, getRoomById(saved.getRoomId()));
    }

    @Override
    public void deactivateZoneRule(UUID id) {
        WarehouseZoneRule rule = getActiveZoneRule(id);
        rule.setIsActive(false);
        rule.setUpdatedBy(authenticatedActorService.currentActor());
        rule.setUpdatedAt(LocalDateTime.now());
        warehouseZoneRuleRepository.save(rule);
    }

    @Override
    public List<MaterialLocationRuleResponse> getMaterialLocationRules(UUID materialId) {
        List<MaterialLocationRule> rules = materialId == null
                ? materialLocationRuleRepository.findByIsActiveTrueOrderByCreatedAtAsc()
                : materialLocationRuleRepository.findByMaterialIdAndIsActiveTrue(materialId).stream().toList();
        return buildMaterialLocationRuleResponses(rules);
    }

    @Override
    public MaterialLocationRuleResponse createMaterialLocationRule(CreateMaterialLocationRuleRequest request) {
        String actor = authenticatedActorService.currentActor();
        ensureMaterialExists(request.getMaterialId());
        if (materialLocationRuleRepository.findByMaterialIdAndIsActiveTrue(request.getMaterialId()).isPresent()) {
            throw new DuplicateResourceException("Material location rule already exists for material");
        }
        validateMaterialLocationReferences(request.getDefaultWarehouseId(), request.getDefaultRoomId(), request.getDefaultRackId(), request.getQuarantineWarehouseId(), request.getQuarantineRoomId());
        MaterialLocationRule rule = MaterialLocationRule.builder()
                .id(UUID.randomUUID())
                .materialId(request.getMaterialId())
                .defaultWarehouseId(request.getDefaultWarehouseId())
                .defaultRoomId(request.getDefaultRoomId())
                .defaultRackId(request.getDefaultRackId())
                .quarantineWarehouseId(request.getQuarantineWarehouseId())
                .quarantineRoomId(request.getQuarantineRoomId())
                .notes(request.getNotes())
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build();
        return buildMaterialLocationRuleResponses(List.of(materialLocationRuleRepository.save(rule))).get(0);
    }

    @Override
    public MaterialLocationRuleResponse updateMaterialLocationRule(UUID id, UpdateMaterialLocationRuleRequest request) {
        String actor = authenticatedActorService.currentActor();
        ensureMaterialExists(request.getMaterialId());
        validateMaterialLocationReferences(request.getDefaultWarehouseId(), request.getDefaultRoomId(), request.getDefaultRackId(), request.getQuarantineWarehouseId(), request.getQuarantineRoomId());
        MaterialLocationRule rule = getActiveMaterialLocationRule(id);
        materialLocationRuleRepository.findByMaterialIdAndIsActiveTrue(request.getMaterialId())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Material location rule already exists for material");
                });
        rule.setMaterialId(request.getMaterialId());
        rule.setDefaultWarehouseId(request.getDefaultWarehouseId());
        rule.setDefaultRoomId(request.getDefaultRoomId());
        rule.setDefaultRackId(request.getDefaultRackId());
        rule.setQuarantineWarehouseId(request.getQuarantineWarehouseId());
        rule.setQuarantineRoomId(request.getQuarantineRoomId());
        rule.setNotes(request.getNotes());
        rule.setUpdatedBy(actor);
        rule.setUpdatedAt(LocalDateTime.now());
        return buildMaterialLocationRuleResponses(List.of(materialLocationRuleRepository.save(rule))).get(0);
    }

    @Override
    public void deactivateMaterialLocationRule(UUID id) {
        MaterialLocationRule rule = getActiveMaterialLocationRule(id);
        rule.setIsActive(false);
        rule.setUpdatedBy(authenticatedActorService.currentActor());
        rule.setUpdatedAt(LocalDateTime.now());
        materialLocationRuleRepository.save(rule);
    }

    private WarehouseZoneRule getActiveZoneRule(UUID id) {
        return warehouseZoneRuleRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse zone rule not found with id: " + id));
    }

    private MaterialLocationRule getActiveMaterialLocationRule(UUID id) {
        return materialLocationRuleRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material location rule not found with id: " + id));
    }

    private void ensureMaterialExists(UUID materialId) {
        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + materialId));
        if (!Boolean.TRUE.equals(material.getIsActive())) {
            throw new BusinessConflictException("Material is inactive: " + materialId);
        }
    }

    private void validateMaterialLocationReferences(
            UUID defaultWarehouseId,
            UUID defaultRoomId,
            UUID defaultRackId,
            UUID quarantineWarehouseId,
            UUID quarantineRoomId
    ) {
        if (defaultWarehouseId != null) {
            ensureWarehouseExists(defaultWarehouseId);
        }
        if (defaultRoomId != null) {
            ensureRoomExists(defaultRoomId);
        }
        if (defaultRackId != null) {
            ensureRackExists(defaultRackId);
        }
        if (quarantineWarehouseId != null) {
            ensureWarehouseExists(quarantineWarehouseId);
        }
        if (quarantineRoomId != null) {
            ensureRoomExists(quarantineRoomId);
        }
    }

    private WarehouseZoneRuleResponse toZoneRuleResponse(WarehouseZoneRule rule, Room room) {
        return WarehouseZoneRuleResponse.builder()
                .id(rule.getId())
                .roomId(rule.getRoomId())
                .roomCode(room != null ? room.getRoomCode() : null)
                .roomName(room != null ? room.getRoomName() : null)
                .zoneName(rule.getZoneName())
                .allowedMaterialType(rule.getAllowedMaterialType())
                .allowedStorageCondition(rule.getAllowedStorageCondition())
                .restrictedAccess(rule.getRestrictedAccess())
                .quarantineOnly(rule.getQuarantineOnly())
                .rejectedOnly(rule.getRejectedOnly())
                .notes(rule.getNotes())
                .createdBy(rule.getCreatedBy())
                .createdAt(rule.getCreatedAt())
                .updatedBy(rule.getUpdatedBy())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    private List<MaterialLocationRuleResponse> buildMaterialLocationRuleResponses(List<MaterialLocationRule> rules) {
        List<Material> materials = materialRepository.findByIsActiveTrueOrderByMaterialCodeAsc();
        List<Warehouse> warehouses = warehouseRepository.findByIsActiveTrueOrderByWarehouseCodeAsc();
        List<Room> rooms = roomRepository.findAll().stream().filter(Room::getIsActive).toList();
        List<Rack> racks = rackRepository.findAll().stream().filter(Rack::getIsActive).toList();
        List<Inventory> inventories = inventoryRepository.findByIsActiveTrue();

        Map<UUID, Material> materialById = materials.stream().collect(java.util.stream.Collectors.toMap(Material::getId, material -> material));
        Map<UUID, Warehouse> warehouseById = warehouses.stream().collect(java.util.stream.Collectors.toMap(Warehouse::getId, warehouse -> warehouse));
        Map<UUID, Room> roomById = rooms.stream().collect(java.util.stream.Collectors.toMap(Room::getId, room -> room));
        Map<UUID, Rack> rackById = racks.stream().collect(java.util.stream.Collectors.toMap(Rack::getId, rack -> rack));

        Map<UUID, Long> lotsByMaterialId = new HashMap<>();
        Map<UUID, BigDecimal> stockByMaterialId = new HashMap<>();
        Map<UUID, String> uomByMaterialId = new HashMap<>();
        for (Inventory inventory : inventories) {
            lotsByMaterialId.merge(inventory.getMaterialId(), 1L, Long::sum);
            stockByMaterialId.merge(inventory.getMaterialId(), inventory.getQuantityOnHand(), BigDecimal::add);
            uomByMaterialId.putIfAbsent(inventory.getMaterialId(), inventory.getUom());
        }

        return rules.stream().map(rule -> {
            Material material = materialById.get(rule.getMaterialId());
            Warehouse defaultWarehouse = rule.getDefaultWarehouseId() != null ? warehouseById.get(rule.getDefaultWarehouseId()) : null;
            Room defaultRoom = rule.getDefaultRoomId() != null ? roomById.get(rule.getDefaultRoomId()) : null;
            Rack defaultRack = rule.getDefaultRackId() != null ? rackById.get(rule.getDefaultRackId()) : null;
            Warehouse quarantineWarehouse = rule.getQuarantineWarehouseId() != null ? warehouseById.get(rule.getQuarantineWarehouseId()) : null;
            Room quarantineRoom = rule.getQuarantineRoomId() != null ? roomById.get(rule.getQuarantineRoomId()) : null;
            return MaterialLocationRuleResponse.builder()
                    .id(rule.getId())
                    .materialId(rule.getMaterialId())
                    .materialCode(material != null ? material.getMaterialCode() : null)
                    .materialName(material != null ? material.getMaterialName() : null)
                    .materialType(material != null ? material.getMaterialType() : null)
                    .storageCondition(material != null && material.getStorageCondition() != null ? material.getStorageCondition().name() : null)
                    .defaultWarehouseId(rule.getDefaultWarehouseId())
                    .defaultWarehouseCode(defaultWarehouse != null ? defaultWarehouse.getWarehouseCode() : null)
                    .defaultRoomId(rule.getDefaultRoomId())
                    .defaultRoomCode(defaultRoom != null ? defaultRoom.getRoomCode() : null)
                    .defaultRackId(rule.getDefaultRackId())
                    .defaultRackCode(defaultRack != null ? defaultRack.getRackCode() : null)
                    .quarantineWarehouseId(rule.getQuarantineWarehouseId())
                    .quarantineWarehouseCode(quarantineWarehouse != null ? quarantineWarehouse.getWarehouseCode() : null)
                    .quarantineRoomId(rule.getQuarantineRoomId())
                    .quarantineRoomCode(quarantineRoom != null ? quarantineRoom.getRoomCode() : null)
                    .notes(rule.getNotes())
                    .currentLots(lotsByMaterialId.getOrDefault(rule.getMaterialId(), 0L))
                    .currentStock(stockByMaterialId.getOrDefault(rule.getMaterialId(), BigDecimal.ZERO))
                    .stockUom(uomByMaterialId.get(rule.getMaterialId()))
                    .createdBy(rule.getCreatedBy())
                    .createdAt(rule.getCreatedAt())
                    .updatedBy(rule.getUpdatedBy())
                    .updatedAt(rule.getUpdatedAt())
                    .build();
        }).toList();
    }

    private void ensureWarehouseExists(UUID warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new ResourceNotFoundException("Warehouse not found with id: " + warehouseId);
        }
        if (!warehouseRepository.existsByIdAndIsActiveTrue(warehouseId)) {
            throw new BusinessConflictException("Warehouse is inactive: " + warehouseId);
        }
    }

    private void ensureBusinessUnitExists(UUID businessUnitId) {
        if (!businessUnitRepository.existsByIdAndIsActiveTrue(businessUnitId)) {
            throw new ResourceNotFoundException("Business unit not found with id: " + businessUnitId);
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

    private List<UUID> getOccupiedPalletIds(List<UUID> palletIds) {
        if (palletIds.isEmpty()) {
            return List.of();
        }

        java.util.LinkedHashSet<UUID> occupiedPalletIds = new java.util.LinkedHashSet<>(
                inventoryRepository.findDistinctActivePalletIdsByPalletIdIn(palletIds)
        );
        occupiedPalletIds.addAll(grnItemRepository.findDistinctActiveUsagePalletIdsByPalletIdIn(palletIds));
        return List.copyOf(occupiedPalletIds);
    }

    private void ensurePalletNotInUse(UUID palletId) {
        if (inventoryRepository.existsByPalletIdAndIsActiveTrue(palletId)) {
            throw new BusinessConflictException("Cannot deactivate pallet with active inventory");
        }
        if (grnItemRepository.existsActiveUsageByPalletId(palletId)) {
            throw new BusinessConflictException("Cannot deactivate pallet with active GRN usage");
        }
    }
}
