package com.batchsphere.core.masterdata.warehouselocation.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreatePalletRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRackRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateRoomRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateShelfRequest;
import com.batchsphere.core.masterdata.warehouselocation.dto.CreateWarehouseRequest;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
class WarehouseLocationServiceIntegrationTest {

    @Autowired
    private WarehouseLocationService warehouseLocationService;

    @BeforeEach
    void setUpAuthentication() {
        AuthenticatedUser user = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("warehouse-tester")
                .email("warehouse-tester@batchsphere.local")
                .passwordHash("ignored")
                .role(UserRole.SUPER_ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allowsSameHierarchyCodesUnderDifferentWarehouses() {
        Warehouse warehouseOne = warehouseLocationService.createWarehouse(createWarehouseRequest("WH1"));
        Warehouse warehouseTwo = warehouseLocationService.createWarehouse(createWarehouseRequest("WH2"));

        assertEquals("warehouse-tester", warehouseOne.getCreatedBy());
        assertEquals("warehouse-tester", warehouseTwo.getCreatedBy());

        Room roomOne = warehouseLocationService.createRoom(warehouseOne.getId(), createRoomRequest("ROOM1"));
        Room roomTwo = assertDoesNotThrow(() ->
                warehouseLocationService.createRoom(warehouseTwo.getId(), createRoomRequest("ROOM1")));

        Rack rackOne = warehouseLocationService.createRack(roomOne.getId(), createRackRequest("RACK1"));
        Rack rackTwo = assertDoesNotThrow(() ->
                warehouseLocationService.createRack(roomTwo.getId(), createRackRequest("RACK1")));

        Shelf shelfOne = warehouseLocationService.createShelf(rackOne.getId(), createShelfRequest("SHELF1"));
        Shelf shelfTwo = assertDoesNotThrow(() ->
                warehouseLocationService.createShelf(rackTwo.getId(), createShelfRequest("SHELF1")));

        assertDoesNotThrow(() ->
                warehouseLocationService.createPallet(shelfOne.getId(), createPalletRequest("PALLET1")));
        assertDoesNotThrow(() ->
                warehouseLocationService.createPallet(shelfTwo.getId(), createPalletRequest("PALLET1")));
    }

    @Test
    void rejectsDuplicateHierarchyCodesWithinSameParent() {
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-DUP"));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest("ROOM-DUP"));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest("RACK-DUP"));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest("SHELF-DUP"));
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest("PALLET-DUP"));

        assertThrows(DuplicateResourceException.class,
                () -> warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest("ROOM-DUP")));
        assertThrows(DuplicateResourceException.class,
                () -> warehouseLocationService.createRack(room.getId(), createRackRequest("RACK-DUP")));
        assertThrows(DuplicateResourceException.class,
                () -> warehouseLocationService.createShelf(rack.getId(), createShelfRequest("SHELF-DUP")));
        assertThrows(DuplicateResourceException.class,
                () -> warehouseLocationService.createPallet(shelf.getId(), createPalletRequest(pallet.getPalletCode())));
    }

    @Test
    void rejectsDeactivatingParentLocationWhileActiveChildrenExist() {
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-ACTIVE"));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest("ROOM-ACTIVE"));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest("RACK-ACTIVE"));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest("SHELF-ACTIVE"));
        warehouseLocationService.createPallet(shelf.getId(), createPalletRequest("PALLET-ACTIVE"));

        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.deactivateWarehouse(warehouse.getId()));
        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.deactivateRoom(room.getId()));
        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.deactivateRack(rack.getId()));
        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.deactivateShelf(shelf.getId()));
    }

    @Test
    void rejectsCreatingChildrenUnderInactiveParentsAndTracksDeletedTimestamp() {
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-INACTIVE"));
        warehouseLocationService.deactivateWarehouse(warehouse.getId());

        Warehouse deactivatedWarehouse = warehouseLocationService.getWarehouseById(warehouse.getId());
        assertNotNull(deactivatedWarehouse.getDeletedAt());
        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest("ROOM-BLOCKED")));

        Warehouse activeWarehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-PARENT"));
        Room room = warehouseLocationService.createRoom(activeWarehouse.getId(), createRoomRequest("ROOM-PARENT"));
        warehouseLocationService.deactivateRoom(room.getId());

        Room deactivatedRoom = warehouseLocationService.getRoomById(room.getId());
        assertNotNull(deactivatedRoom.getDeletedAt());
        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.createRack(room.getId(), createRackRequest("RACK-BLOCKED")));
    }

    private CreateWarehouseRequest createWarehouseRequest(String code) {
        CreateWarehouseRequest request = new CreateWarehouseRequest();
        request.setWarehouseCode(code);
        request.setWarehouseName(code + "-NAME");
        request.setCreatedBy("test-user");
        return request;
    }

    private CreateRoomRequest createRoomRequest(String code) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomCode(code);
        request.setRoomName(code + "-NAME");
        request.setStorageCondition(StorageCondition.ROOM_TEMPERATURE);
        request.setCreatedBy("test-user");
        return request;
    }

    private CreateRackRequest createRackRequest(String code) {
        CreateRackRequest request = new CreateRackRequest();
        request.setRackCode(code);
        request.setRackName(code + "-NAME");
        request.setCreatedBy("test-user");
        return request;
    }

    private CreateShelfRequest createShelfRequest(String code) {
        CreateShelfRequest request = new CreateShelfRequest();
        request.setShelfCode(code);
        request.setShelfName(code + "-NAME");
        request.setCreatedBy("test-user");
        return request;
    }

    private CreatePalletRequest createPalletRequest(String code) {
        CreatePalletRequest request = new CreatePalletRequest();
        request.setPalletCode(code);
        request.setPalletName(code + "-NAME");
        request.setCreatedBy("test-user");
        return request;
    }
}
