package com.batchsphere.core.masterdata.warehouselocation.service;

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
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface WarehouseLocationService {

    Warehouse createWarehouse(CreateWarehouseRequest request);
    Warehouse getWarehouseById(UUID id);
    Page<Warehouse> getAllWarehouses(Pageable pageable);
    List<WarehouseHierarchyResponse> getWarehouseTree();
    Warehouse updateWarehouse(UUID id, UpdateWarehouseRequest request);
    void deactivateWarehouse(UUID id);

    Room createRoom(UUID warehouseId, CreateRoomRequest request);
    Room getRoomById(UUID id);
    Page<Room> getAllRooms(UUID warehouseId, Pageable pageable);
    Room updateRoom(UUID warehouseId, UUID id, UpdateRoomRequest request);
    void deactivateRoom(UUID id);

    Rack createRack(UUID roomId, CreateRackRequest request);
    Rack getRackById(UUID id);
    Page<Rack> getAllRacks(UUID roomId, Pageable pageable);
    Rack updateRack(UUID roomId, UUID id, UpdateRackRequest request);
    void deactivateRack(UUID id);

    Shelf createShelf(UUID rackId, CreateShelfRequest request);
    Shelf getShelfById(UUID id);
    Page<Shelf> getAllShelves(UUID rackId, Pageable pageable);
    Shelf updateShelf(UUID rackId, UUID id, UpdateShelfRequest request);
    void deactivateShelf(UUID id);

    Pallet createPallet(UUID shelfId, CreatePalletRequest request);
    Pallet getPalletById(UUID id);
    Page<Pallet> getAllPallets(UUID shelfId, Pageable pageable);
    List<AvailablePalletResponse> getAvailablePallets(StorageCondition storageCondition);
    Pallet updatePallet(UUID shelfId, UUID id, UpdatePalletRequest request);
    void deactivatePallet(UUID id);

    WmsSummaryResponse getWmsSummary();

    List<WarehouseZoneRuleResponse> getZoneRules(UUID roomId);
    WarehouseZoneRuleResponse createZoneRule(CreateWarehouseZoneRuleRequest request);
    WarehouseZoneRuleResponse updateZoneRule(UUID id, UpdateWarehouseZoneRuleRequest request);
    void deactivateZoneRule(UUID id);

    List<MaterialLocationRuleResponse> getMaterialLocationRules(UUID materialId);
    MaterialLocationRuleResponse createMaterialLocationRule(CreateMaterialLocationRuleRequest request);
    MaterialLocationRuleResponse updateMaterialLocationRule(UUID id, UpdateMaterialLocationRuleRequest request);
    void deactivateMaterialLocationRule(UUID id);
}
