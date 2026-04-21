package com.batchsphere.core.masterdata.warehouselocation.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.entity.BatchType;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import com.batchsphere.core.masterdata.warehouselocation.dto.AvailablePalletResponse;
import com.batchsphere.core.masterdata.warehouselocation.dto.WarehouseHierarchyResponse;
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
import com.batchsphere.core.transactions.grn.entity.ContainerType;
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import com.batchsphere.core.transactions.grn.entity.QcStatus;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorBusinessUnitRepository vendorBusinessUnitRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private GrnRepository grnRepository;

    @Autowired
    private GrnItemRepository grnItemRepository;

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

    @Test
    void returnsWarehouseTreeAcrossHierarchy() {
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-TREE"));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest("ROOM-TREE"));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest("RACK-TREE"));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest("SHELF-TREE"));
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest("PALLET-TREE"));

        List<WarehouseHierarchyResponse> tree = warehouseLocationService.getWarehouseTree();

        WarehouseHierarchyResponse warehouseNode = tree.stream()
                .filter(node -> node.id().equals(warehouse.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals("WH-TREE", warehouseNode.warehouseCode());
        assertEquals(1, warehouseNode.rooms().size());
        assertEquals(room.getId(), warehouseNode.rooms().get(0).id());
        assertEquals(rack.getId(), warehouseNode.rooms().get(0).racks().get(0).id());
        assertEquals(shelf.getId(), warehouseNode.rooms().get(0).racks().get(0).shelves().get(0).id());
        assertEquals(pallet.getId(), warehouseNode.rooms().get(0).racks().get(0).shelves().get(0).pallets().get(0).id());
    }

    @Test
    void returnsAvailablePalletsAndSupportsStorageConditionFilter() {
        Warehouse roomTempWarehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-ROOM"));
        Room roomTempRoom = warehouseLocationService.createRoom(roomTempWarehouse.getId(), createRoomRequest("ROOM-ROOM"));
        Rack roomTempRack = warehouseLocationService.createRack(roomTempRoom.getId(), createRackRequest("RACK-ROOM"));
        Shelf roomTempShelf = warehouseLocationService.createShelf(roomTempRack.getId(), createShelfRequest("SHELF-ROOM"));
        Pallet roomTempPallet = warehouseLocationService.createPallet(roomTempShelf.getId(), createPalletRequest("PALLET-ROOM"));

        Warehouse coldWarehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-COLD"));
        CreateRoomRequest coldRoomRequest = createRoomRequest("ROOM-COLD");
        coldRoomRequest.setStorageCondition(StorageCondition.COLD);
        Room coldRoom = warehouseLocationService.createRoom(coldWarehouse.getId(), coldRoomRequest);
        Rack coldRack = warehouseLocationService.createRack(coldRoom.getId(), createRackRequest("RACK-COLD"));
        Shelf coldShelf = warehouseLocationService.createShelf(coldRack.getId(), createShelfRequest("SHELF-COLD"));
        Pallet coldPallet = warehouseLocationService.createPallet(coldShelf.getId(), createPalletRequest("PALLET-COLD"));

        List<AvailablePalletResponse> allPallets = warehouseLocationService.getAvailablePallets(null);
        assertEquals(true, allPallets.stream().anyMatch(pallet -> pallet.palletId().equals(roomTempPallet.getId())));
        assertEquals(true, allPallets.stream().anyMatch(pallet -> pallet.palletId().equals(coldPallet.getId())));

        List<AvailablePalletResponse> coldPallets = warehouseLocationService.getAvailablePallets(StorageCondition.COLD);
        assertEquals(1, coldPallets.stream().filter(pallet -> pallet.palletId().equals(coldPallet.getId())).count());
        assertEquals(0, coldPallets.stream().filter(pallet -> pallet.palletId().equals(roomTempPallet.getId())).count());
        assertEquals("WH-COLD", coldPallets.get(0).warehouseCode());
        assertEquals("ROOM-COLD", coldPallets.get(0).roomCode());
    }

    @Test
    void excludesOccupiedPalletsFromAvailablePallets() {
        Pallet inventoryPallet = createPalletWithHierarchy("INV-" + UUID.randomUUID().toString().substring(0, 6));
        Pallet grnPallet = createPalletWithHierarchy("GRN-" + UUID.randomUUID().toString().substring(0, 6));
        Pallet freePallet = createPalletWithHierarchy("FREE-" + UUID.randomUUID().toString().substring(0, 6));
        Batch inventoryBatch = createBatchFixture("INV-BATCH");

        inventoryRepository.save(Inventory.builder()
                .id(UUID.randomUUID())
                .materialId(inventoryBatch.getMaterial().getId())
                .batchId(inventoryBatch.getId())
                .warehouseLocation(inventoryPallet.getPalletCode())
                .palletId(inventoryPallet.getId())
                .quantityOnHand(new BigDecimal("10.000"))
                .uom("KG")
                .status(InventoryStatus.QUARANTINE)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        Batch grnBatch = createBatchFixture("AVAIL-GRN-BATCH");
        GrnFixture grnFixture = createGrnFixture("AVAIL-GRN");
        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-" + UUID.randomUUID().toString().substring(0, 8))
                .supplierId(grnFixture.supplierId())
                .vendorId(grnFixture.vendorId())
                .vendorBusinessUnitId(grnFixture.vendorBusinessUnitId())
                .receiptDate(LocalDate.now())
                .status(GrnStatus.DRAFT)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());
        grnItemRepository.save(GrnItem.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .lineNumber(1)
                .materialId(grnBatch.getMaterial().getId())
                .batchId(grnBatch.getId())
                .receivedQuantity(new BigDecimal("20.000"))
                .acceptedQuantity(BigDecimal.ZERO)
                .rejectedQuantity(BigDecimal.ZERO)
                .uom("KG")
                .warehouseLocation(grnPallet.getPalletCode())
                .palletId(grnPallet.getId())
                .containerType(ContainerType.BAG)
                .numberOfContainers(4)
                .quantityPerContainer(new BigDecimal("5.000"))
                .vendorBatch("VB-" + UUID.randomUUID().toString().substring(0, 6))
                .unitPrice(new BigDecimal("100.00"))
                .totalPrice(new BigDecimal("2000.00"))
                .qcStatus(QcStatus.PENDING)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        List<AvailablePalletResponse> pallets = warehouseLocationService.getAvailablePallets(StorageCondition.ROOM_TEMPERATURE);

        assertEquals(0, pallets.stream().filter(pallet -> pallet.palletId().equals(inventoryPallet.getId())).count());
        assertEquals(0, pallets.stream().filter(pallet -> pallet.palletId().equals(grnPallet.getId())).count());
        assertEquals(1, pallets.stream().filter(pallet -> pallet.palletId().equals(freePallet.getId())).count());
    }

    @Test
    void rejectsDeactivatingPalletWhileItIsInUse() {
        Pallet inventoryPallet = createPalletWithHierarchy("INV-DEACT-" + UUID.randomUUID().toString().substring(0, 6));
        Batch inventoryBatch = createBatchFixture("INV-DEACT-BATCH");
        inventoryRepository.save(Inventory.builder()
                .id(UUID.randomUUID())
                .materialId(inventoryBatch.getMaterial().getId())
                .batchId(inventoryBatch.getId())
                .warehouseLocation(inventoryPallet.getPalletCode())
                .palletId(inventoryPallet.getId())
                .quantityOnHand(new BigDecimal("5.000"))
                .uom("KG")
                .status(InventoryStatus.QUARANTINE)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        Pallet grnPallet = createPalletWithHierarchy("GRN-DEACT-" + UUID.randomUUID().toString().substring(0, 6));
        Batch grnBatch = createBatchFixture("DEACT-GRN-BATCH");
        GrnFixture grnFixture = createGrnFixture("DEACT-GRN");
        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-" + UUID.randomUUID().toString().substring(0, 8))
                .supplierId(grnFixture.supplierId())
                .vendorId(grnFixture.vendorId())
                .vendorBusinessUnitId(grnFixture.vendorBusinessUnitId())
                .receiptDate(LocalDate.now())
                .status(GrnStatus.DRAFT)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());
        grnItemRepository.save(GrnItem.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .lineNumber(1)
                .materialId(grnBatch.getMaterial().getId())
                .batchId(grnBatch.getId())
                .receivedQuantity(new BigDecimal("8.000"))
                .acceptedQuantity(BigDecimal.ZERO)
                .rejectedQuantity(BigDecimal.ZERO)
                .uom("KG")
                .warehouseLocation(grnPallet.getPalletCode())
                .palletId(grnPallet.getId())
                .containerType(ContainerType.BAG)
                .numberOfContainers(2)
                .quantityPerContainer(new BigDecimal("4.000"))
                .vendorBatch("VB-" + UUID.randomUUID().toString().substring(0, 6))
                .unitPrice(new BigDecimal("50.00"))
                .totalPrice(new BigDecimal("400.00"))
                .qcStatus(QcStatus.PENDING)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.deactivatePallet(inventoryPallet.getId()));
        assertThrows(BusinessConflictException.class,
                () -> warehouseLocationService.deactivatePallet(grnPallet.getId()));
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

    private Pallet createPalletWithHierarchy(String suffix) {
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest("WH-" + suffix));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest("ROOM-" + suffix));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest("RACK-" + suffix));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest("SHELF-" + suffix));
        return warehouseLocationService.createPallet(shelf.getId(), createPalletRequest("PALLET-" + suffix));
    }

    private Batch createBatchFixture(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode(prefix + "-MAT-" + suffix)
                .materialName(prefix + "-MATERIAL")
                .materialType("RAW_MATERIAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(false)
                .samplingRequired(true)
                .description("test material")
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        return batchRepository.save(Batch.builder()
                .id(UUID.randomUUID())
                .batchNumber(prefix + "-BATCH-" + suffix)
                .material(material)
                .batchType(BatchType.RAW_MATERIAL)
                .batchStatus(BatchStatus.QUARANTINE)
                .quantity(new BigDecimal("100.000"))
                .unitOfMeasure("KG")
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private GrnFixture createGrnFixture(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode(prefix + "-SUP-" + suffix)
                .supplierName(prefix + "-SUPPLIER")
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode(prefix + "-VEN-" + suffix)
                .vendorName(prefix + "-VENDOR")
                .isApproved(true)
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        VendorBusinessUnit vendorBusinessUnit = vendorBusinessUnitRepository.save(VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendor.getId())
                .unitName(prefix + "-UNIT")
                .isActive(true)
                .createdBy("warehouse-tester")
                .createdAt(LocalDateTime.now())
                .build());

        return new GrnFixture(supplier.getId(), vendor.getId(), vendorBusinessUnit.getId());
    }

    private record GrnFixture(UUID supplierId, UUID vendorId, UUID vendorBusinessUnitId) {
    }
}
