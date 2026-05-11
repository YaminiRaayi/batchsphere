package com.batchsphere.core.transactions.inventory.controller;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.entity.BatchType;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import com.batchsphere.core.masterdata.businessunit.repository.BusinessUnitRepository;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
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
import com.batchsphere.core.masterdata.warehouselocation.service.WarehouseLocationService;
import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransaction;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransactionType;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import com.batchsphere.core.transactions.inventory.repository.InventoryTransactionRepository;
import com.batchsphere.core.transactions.inventory.service.InventoryService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class InventoryControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private WarehouseLocationService warehouseLocationService;

    @Autowired
    private BusinessUnitRepository businessUnitRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        setFixtureAuthentication();
    }

    private void setFixtureAuthentication() {
        AuthenticatedUser fixtureUser = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("inventory-fixture")
                .email("inventory-fixture@batchsphere.local")
                .passwordHash("ignored")
                .role(UserRole.SUPER_ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(fixtureUser, null, fixtureUser.getAuthorities())
        );
    }

    @Test
    void validStatusTransitionUpdatesInventoryAndWritesTransaction() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.QUARANTINE));
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(put("/api/inventory/{id}/status", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "SAMPLING",
                                  "remarks": "Sampling initiated by warehouse"
                                }
                                """))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals("SAMPLING", root.get("status").asText());

        Inventory savedInventory = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertEquals(InventoryStatus.SAMPLING, savedInventory.getStatus());
        assertEquals("admin", savedInventory.getUpdatedBy());

        List<InventoryTransaction> transactions = inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> transaction.getInventoryId().equals(inventory.getId()))
                .sorted(Comparator.comparing(InventoryTransaction::getCreatedAt))
                .toList();
        assertEquals(1, transactions.size());
        assertEquals(InventoryTransactionType.STATUS_CHANGE, transactions.get(0).getTransactionType());
        assertTrue(transactions.get(0).getRemarks().contains("QUARANTINE"));
        assertTrue(transactions.get(0).getRemarks().contains("SAMPLING"));
    }

    @Test
    void invalidStatusTransitionReturnsConflictAndKeepsInventoryUnchanged() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.QUARANTINE));
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(put("/api/inventory/{id}/status", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "RELEASED"
                                }
                                """))
                .andReturn();

        assertEquals(409, result.getResponse().getStatus(), result.getResponse().getContentAsString());

        Inventory savedInventory = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertEquals(InventoryStatus.QUARANTINE, savedInventory.getStatus());
        long transactionCount = inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> transaction.getInventoryId().equals(inventory.getId()))
                .count();
        assertEquals(0, transactionCount);
    }

    @Test
    void adjustmentUpdatesQuantityAndWritesAdjustmentTransaction() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.QUARANTINE));
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(post("/api/inventory/{id}/adjust", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "quantityDelta": 5.000,
                                  "reason": "Cycle count correction"
                                }
                                """))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(new BigDecimal("30.0"), root.get("quantityOnHand").decimalValue());

        Inventory savedInventory = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertEquals(new BigDecimal("30.000"), savedInventory.getQuantityOnHand());
        assertTrue(inventoryTransactionRepository.findAll().stream()
                .anyMatch(transaction -> transaction.getInventoryId().equals(inventory.getId())
                        && transaction.getTransactionType() == InventoryTransactionType.ADJUSTMENT
                        && new BigDecimal("25.000").compareTo(transaction.getBeforeQuantity()) == 0
                        && new BigDecimal("30.000").compareTo(transaction.getAfterQuantity()) == 0));
    }

    @Test
    void issueReducesReleasedInventoryAndWritesOutboundTransaction() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.RELEASED));
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(post("/api/inventory/{id}/issue", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "quantity": 5.000,
                                  "referenceType": "PRODUCTION",
                                  "referenceNumber": "PRD-001",
                                  "reason": "Issued to production",
                                  "remarks": "Line 1 staging"
                                }
                                """))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(new BigDecimal("20.0"), root.get("quantityOnHand").decimalValue());

        Inventory savedInventory = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertEquals(new BigDecimal("20.000"), savedInventory.getQuantityOnHand());
        assertTrue(inventoryTransactionRepository.findAll().stream()
                .anyMatch(transaction -> transaction.getInventoryId().equals(inventory.getId())
                        && transaction.getTransactionType() == InventoryTransactionType.OUTBOUND
                        && "PRD-001".equals(transaction.getReferenceNumber())
                        && new BigDecimal("-5.000").compareTo(transaction.getQuantity()) == 0
                        && new BigDecimal("25.000").compareTo(transaction.getBeforeQuantity()) == 0
                        && new BigDecimal("20.000").compareTo(transaction.getAfterQuantity()) == 0));
    }

    @Test
    void expiredReleasedInventoryCannotBeIssued() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.RELEASED, LocalDate.now().minusDays(1), LocalDate.now().plusDays(30)));
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(post("/api/inventory/{id}/issue", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "quantity": 5.000,
                                  "referenceType": "PRODUCTION",
                                  "referenceNumber": "PRD-002",
                                  "reason": "Issued to production"
                                }
                                """))
                .andReturn();

        assertEquals(409, result.getResponse().getStatus(), result.getResponse().getContentAsString());
    }

    @Test
    void retestOverdueReleasedInventoryCannotBeIssued() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.RELEASED, LocalDate.now().plusDays(60), LocalDate.now().minusDays(1)));
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(post("/api/inventory/{id}/issue", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "quantity": 5.000,
                                  "referenceType": "PRODUCTION",
                                  "referenceNumber": "PRD-003",
                                  "reason": "Issued to production"
                                }
                                """))
                .andReturn();

        assertEquals(409, result.getResponse().getStatus(), result.getResponse().getContentAsString());
    }

    @Test
    void samplingConsumptionReducesInventoryAndWritesTransaction() {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.SAMPLING));

        inventoryService.consumeForSampling(inventory.getId(), UUID.randomUUID(), new BigDecimal("0.500"), "tester");

        Inventory savedInventory = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertEquals(new BigDecimal("24.500"), savedInventory.getQuantityOnHand());
        assertTrue(inventoryTransactionRepository.findAll().stream()
                .anyMatch(transaction -> transaction.getInventoryId().equals(inventory.getId())
                        && transaction.getTransactionType() == InventoryTransactionType.SAMPLING_CONSUMPTION
                        && new BigDecimal("-0.500").compareTo(transaction.getQuantity()) == 0
                        && new BigDecimal("25.000").compareTo(transaction.getBeforeQuantity()) == 0
                        && new BigDecimal("24.500").compareTo(transaction.getAfterQuantity()) == 0));
    }

    @Test
    void transferMovesQuantityToDestinationPalletAndWritesTransferTransactions() throws Exception {
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.QUARANTINE));
        Pallet destinationPallet = createPalletHierarchy();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult result = mockMvc.perform(post("/api/inventory/{id}/transfer", inventory.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "destinationPalletId": "%s",
                                  "quantity": 10.000,
                                  "remarks": "Move to overflow pallet"
                                }
                                """.formatted(destinationPallet.getId())))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(destinationPallet.getId().toString(), root.get("palletId").asText());
        assertEquals(new BigDecimal("10.0"), root.get("quantityOnHand").decimalValue());

        Inventory sourceInventory = inventoryRepository.findById(inventory.getId()).orElseThrow();
        assertEquals(new BigDecimal("15.000"), sourceInventory.getQuantityOnHand());

        Inventory destinationInventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        inventory.getMaterialId(),
                        inventory.getBatchId(),
                        destinationPallet.getId()
                )
                .orElseThrow();
        assertEquals(new BigDecimal("10.000"), destinationInventory.getQuantityOnHand());

        long transferTransactions = inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> transaction.getTransactionType() == InventoryTransactionType.TRANSFER)
                .count();
        assertEquals(2, transferTransactions);
    }

    @Test
    void summaryReturnsCountsGroupedByStatus() throws Exception {
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        MvcResult baselineResult = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/inventory/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        JsonNode baselineRoot = objectMapper.readTree(baselineResult.getResponse().getContentAsString());
        int baselineQuarantine = baselineRoot.get("countsByStatus").get("QUARANTINE").asInt();
        int baselineUnderTest = baselineRoot.get("countsByStatus").get("UNDER_TEST").asInt();

        setFixtureAuthentication();
        inventoryRepository.save(buildInventory(InventoryStatus.QUARANTINE));
        inventoryRepository.save(buildInventory(InventoryStatus.UNDER_TEST));
        SecurityContextHolder.clearContext();

        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/inventory/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(baselineQuarantine + 1, root.get("countsByStatus").get("QUARANTINE").asInt());
        assertEquals(baselineUnderTest + 1, root.get("countsByStatus").get("UNDER_TEST").asInt());
    }

    @Test
    void zeroQuantityInventoryIsExcludedFromActiveSummary() throws Exception {
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        MvcResult baselineResult = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/inventory/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        JsonNode baselineRoot = objectMapper.readTree(baselineResult.getResponse().getContentAsString());
        int baselineReleased = baselineRoot.get("countsByStatus").get("RELEASED").asInt();

        setFixtureAuthentication();
        Inventory inventory = inventoryRepository.save(buildInventory(InventoryStatus.RELEASED));
        inventory.setQuantityOnHand(BigDecimal.ZERO);
        inventoryRepository.save(inventory);
        SecurityContextHolder.clearContext();

        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/inventory/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(baselineReleased, root.get("countsByStatus").get("RELEASED").asInt());
    }

    private String loginAsAdmin() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin",
                                  "password": "Admin@123"
                                }
                                """))
                .andReturn();

        assertEquals(200, loginResult.getResponse().getStatus(), loginResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        return root.get("accessToken").asText();
    }

    private Inventory buildInventory(InventoryStatus status) {
        return buildInventory(status, LocalDate.now().plusMonths(12), LocalDate.now().plusMonths(6));
    }

    private Inventory buildInventory(InventoryStatus status, LocalDate expiryDate, LocalDate retestDueDate) {
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-" + UUID.randomUUID().toString().substring(0, 8))
                .materialName("Inventory Test Material")
                .materialType("RAW_MATERIAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(false)
                .samplingRequired(true)
                .description("inventory test")
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        Batch batch = batchRepository.save(Batch.builder()
                .id(UUID.randomUUID())
                .batchNumber("BATCH-" + UUID.randomUUID().toString().substring(0, 8))
                .material(material)
                .batchType(BatchType.RAW_MATERIAL)
                .batchStatus(BatchStatus.QUARANTINE)
                .quantity(new BigDecimal("25.000"))
                .unitOfMeasure("KG")
                .manufactureDate(LocalDate.now())
                .expiryDate(expiryDate)
                .retestDate(retestDueDate)
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        Pallet pallet = createPalletHierarchy();
        return Inventory.builder()
                .id(UUID.randomUUID())
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation("WH-1/ROOM-1/RACK-1/SHELF-1/PALLET-1")
                .palletId(pallet.getId())
                .quantityOnHand(new BigDecimal("25.000"))
                .uom("KG")
                .expiryDate(expiryDate)
                .retestDueDate(retestDueDate)
                .status(status)
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build();
    }

    private Pallet createPalletHierarchy() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        BusinessUnit businessUnit = businessUnitRepository.save(BusinessUnit.builder()
                .id(UUID.randomUUID())
                .unitCode("BU-" + suffix)
                .unitName("Business Unit " + suffix)
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        CreateWarehouseRequest warehouseRequest = new CreateWarehouseRequest();
        warehouseRequest.setWarehouseCode("WH-" + suffix);
        warehouseRequest.setWarehouseName("Warehouse " + suffix);
        warehouseRequest.setBusinessUnitId(businessUnit.getId());
        warehouseRequest.setCreatedBy("seed-user");
        Warehouse warehouse = warehouseLocationService.createWarehouse(warehouseRequest);

        CreateRoomRequest roomRequest = new CreateRoomRequest();
        roomRequest.setRoomCode("ROOM-" + suffix);
        roomRequest.setRoomName("Room " + suffix);
        roomRequest.setStorageCondition(StorageCondition.ROOM_TEMPERATURE);
        roomRequest.setCreatedBy("seed-user");
        Room room = warehouseLocationService.createRoom(warehouse.getId(), roomRequest);

        CreateRackRequest rackRequest = new CreateRackRequest();
        rackRequest.setRackCode("RACK-" + suffix);
        rackRequest.setRackName("Rack " + suffix);
        rackRequest.setCreatedBy("seed-user");
        Rack rack = warehouseLocationService.createRack(room.getId(), rackRequest);

        CreateShelfRequest shelfRequest = new CreateShelfRequest();
        shelfRequest.setShelfCode("SHELF-" + suffix);
        shelfRequest.setShelfName("Shelf " + suffix);
        shelfRequest.setCreatedBy("seed-user");
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), shelfRequest);

        CreatePalletRequest palletRequest = new CreatePalletRequest();
        palletRequest.setPalletCode("PALLET-" + suffix);
        palletRequest.setPalletName("Pallet " + suffix);
        palletRequest.setCreatedBy("seed-user");
        return warehouseLocationService.createPallet(shelf.getId(), palletRequest);
    }
}
