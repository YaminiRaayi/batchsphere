package com.batchsphere.core.masterdata.warehouselocation.controller;

import com.batchsphere.core.masterdata.warehouselocation.dto.CreatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.AvailablePalletResponse;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.UpdateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.WarehouseHierarchyResponse;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.warehouselocation.service.WarehouseLocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WarehouseLocationController {

    private final WarehouseLocationService warehouseLocationService;

    @PostMapping("/warehouses")
    public ResponseEntity<Warehouse> createWarehouse(@Valid @RequestBody CreateWarehouseRequest request) {
        return ResponseEntity.ok(warehouseLocationService.createWarehouse(request));
    }

    @GetMapping("/warehouses/{id}")
    public ResponseEntity<Warehouse> getWarehouseById(@PathVariable UUID id) {
        return ResponseEntity.ok(warehouseLocationService.getWarehouseById(id));
    }

    @GetMapping("/warehouses")
    public ResponseEntity<Page<Warehouse>> getAllWarehouses(Pageable pageable) {
        return ResponseEntity.ok(warehouseLocationService.getAllWarehouses(pageable));
    }

    @GetMapping("/warehouses/tree")
    public ResponseEntity<List<WarehouseHierarchyResponse>> getWarehouseTree() {
        return ResponseEntity.ok(warehouseLocationService.getWarehouseTree());
    }

    @PutMapping("/warehouses/{id}")
    public ResponseEntity<Warehouse> updateWarehouse(@PathVariable UUID id, @Valid @RequestBody UpdateWarehouseRequest request) {
        return ResponseEntity.ok(warehouseLocationService.updateWarehouse(id, request));
    }

    @DeleteMapping("/warehouses/{id}")
    public ResponseEntity<Void> deactivateWarehouse(@PathVariable UUID id) {
        warehouseLocationService.deactivateWarehouse(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/warehouses/{warehouseId}/rooms")
    public ResponseEntity<Room> createRoom(@PathVariable UUID warehouseId, @Valid @RequestBody CreateRoomRequest request) {
        return ResponseEntity.ok(warehouseLocationService.createRoom(warehouseId, request));
    }

    @GetMapping("/rooms/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable UUID id) {
        return ResponseEntity.ok(warehouseLocationService.getRoomById(id));
    }

    @GetMapping("/rooms")
    public ResponseEntity<Page<Room>> getAllRooms(@RequestParam(required = false) UUID warehouseId, Pageable pageable) {
        return ResponseEntity.ok(warehouseLocationService.getAllRooms(warehouseId, pageable));
    }

    @PutMapping("/warehouses/{warehouseId}/rooms/{id}")
    public ResponseEntity<Room> updateRoom(@PathVariable UUID warehouseId, @PathVariable UUID id, @Valid @RequestBody UpdateRoomRequest request) {
        return ResponseEntity.ok(warehouseLocationService.updateRoom(warehouseId, id, request));
    }

    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<Void> deactivateRoom(@PathVariable UUID id) {
        warehouseLocationService.deactivateRoom(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rooms/{roomId}/racks")
    public ResponseEntity<Rack> createRack(@PathVariable UUID roomId, @Valid @RequestBody CreateRackRequest request) {
        return ResponseEntity.ok(warehouseLocationService.createRack(roomId, request));
    }

    @GetMapping("/racks/{id}")
    public ResponseEntity<Rack> getRackById(@PathVariable UUID id) {
        return ResponseEntity.ok(warehouseLocationService.getRackById(id));
    }

    @GetMapping("/racks")
    public ResponseEntity<Page<Rack>> getAllRacks(@RequestParam(required = false) UUID roomId, Pageable pageable) {
        return ResponseEntity.ok(warehouseLocationService.getAllRacks(roomId, pageable));
    }

    @PutMapping("/rooms/{roomId}/racks/{id}")
    public ResponseEntity<Rack> updateRack(@PathVariable UUID roomId, @PathVariable UUID id, @Valid @RequestBody UpdateRackRequest request) {
        return ResponseEntity.ok(warehouseLocationService.updateRack(roomId, id, request));
    }

    @DeleteMapping("/racks/{id}")
    public ResponseEntity<Void> deactivateRack(@PathVariable UUID id) {
        warehouseLocationService.deactivateRack(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/racks/{rackId}/shelves")
    public ResponseEntity<Shelf> createShelf(@PathVariable UUID rackId, @Valid @RequestBody CreateShelfRequest request) {
        return ResponseEntity.ok(warehouseLocationService.createShelf(rackId, request));
    }

    @GetMapping("/shelves/{id}")
    public ResponseEntity<Shelf> getShelfById(@PathVariable UUID id) {
        return ResponseEntity.ok(warehouseLocationService.getShelfById(id));
    }

    @GetMapping("/shelves")
    public ResponseEntity<Page<Shelf>> getAllShelves(@RequestParam(required = false) UUID rackId, Pageable pageable) {
        return ResponseEntity.ok(warehouseLocationService.getAllShelves(rackId, pageable));
    }

    @PutMapping("/racks/{rackId}/shelves/{id}")
    public ResponseEntity<Shelf> updateShelf(@PathVariable UUID rackId, @PathVariable UUID id, @Valid @RequestBody UpdateShelfRequest request) {
        return ResponseEntity.ok(warehouseLocationService.updateShelf(rackId, id, request));
    }

    @DeleteMapping("/shelves/{id}")
    public ResponseEntity<Void> deactivateShelf(@PathVariable UUID id) {
        warehouseLocationService.deactivateShelf(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/shelves/{shelfId}/pallets")
    public ResponseEntity<Pallet> createPallet(@PathVariable UUID shelfId, @Valid @RequestBody CreatePalletRequest request) {
        return ResponseEntity.ok(warehouseLocationService.createPallet(shelfId, request));
    }

    @GetMapping("/pallets/{id}")
    public ResponseEntity<Pallet> getPalletById(@PathVariable UUID id) {
        return ResponseEntity.ok(warehouseLocationService.getPalletById(id));
    }

    @GetMapping("/pallets")
    public ResponseEntity<Page<Pallet>> getAllPallets(@RequestParam(required = false) UUID shelfId, Pageable pageable) {
        return ResponseEntity.ok(warehouseLocationService.getAllPallets(shelfId, pageable));
    }

    @GetMapping("/pallets/available")
    public ResponseEntity<List<AvailablePalletResponse>> getAvailablePallets(@RequestParam(required = false) StorageCondition storageCondition) {
        return ResponseEntity.ok(warehouseLocationService.getAvailablePallets(storageCondition));
    }

    @PutMapping("/shelves/{shelfId}/pallets/{id}")
    public ResponseEntity<Pallet> updatePallet(@PathVariable UUID shelfId, @PathVariable UUID id, @Valid @RequestBody UpdatePalletRequest request) {
        return ResponseEntity.ok(warehouseLocationService.updatePallet(shelfId, id, request));
    }

    @DeleteMapping("/pallets/{id}")
    public ResponseEntity<Void> deactivatePallet(@PathVariable UUID id) {
        warehouseLocationService.deactivatePallet(id);
        return ResponseEntity.noContent().build();
    }
}
