package com.batchsphere.core.transactions.grn.controller;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
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
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnDocument;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.repository.GrnContainerRepository;
import com.batchsphere.core.transactions.grn.repository.GrnDocumentRepository;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.grn.repository.MaterialLabelRepository;
import com.batchsphere.core.transactions.inventory.entity.InventoryReferenceType;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransactionType;
import com.batchsphere.core.transactions.inventory.repository.InventoryTransactionRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class GrnControllerIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorBusinessUnitRepository vendorBusinessUnitRepository;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private WarehouseLocationService warehouseLocationService;

    @Autowired
    private GrnRepository grnRepository;

    @Autowired
    private GrnItemRepository grnItemRepository;

    @Autowired
    private GrnDocumentRepository grnDocumentRepository;

    @Autowired
    private GrnContainerRepository grnContainerRepository;

    @Autowired
    private MaterialLabelRepository materialLabelRepository;

    @Autowired
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Autowired
    private SamplingRequestRepository samplingRequestRepository;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        setFixtureAuthentication();
    }

    @Test
    void summaryReturnsCountsGroupedByStatus() throws Exception {
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        MvcResult baselineResult = mockMvc.perform(get("/api/grns/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        JsonNode baselineRoot = objectMapper.readTree(baselineResult.getResponse().getContentAsString());
        int baselineDraft = baselineRoot.get("countsByStatus").get("DRAFT").asInt();
        int baselineReceived = baselineRoot.get("countsByStatus").get("RECEIVED").asInt();

        setFixtureAuthentication();
        FixtureData fixture = createFixtureData();
        createGrn(fixture, "GRN-DRAFT-" + UUID.randomUUID().toString().substring(0, 8), token);
        UUID receivedGrnId = createGrn(fixture, "GRN-REC-" + UUID.randomUUID().toString().substring(0, 8), token);
        mockMvc.perform(post("/api/grns/{id}/receive", receivedGrnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "updatedBy": "admin"
                                }
                                """))
                .andReturn();

        MvcResult result = mockMvc.perform(get("/api/grns/summary")
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(baselineDraft + 1, root.get("countsByStatus").get("DRAFT").asInt());
        assertEquals(baselineReceived + 1, root.get("countsByStatus").get("RECEIVED").asInt());
    }

    @Test
    void labelPrintDataReturnsGeneratedContainerLabelsForReceivedGrn() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-LABEL-" + UUID.randomUUID().toString().substring(0, 8), token);

        MvcResult receiveResult = mockMvc.perform(post("/api/grns/{id}/receive", grnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "updatedBy": "admin"
                                }
                                """))
                .andReturn();
        assertEquals(200, receiveResult.getResponse().getStatus(), receiveResult.getResponse().getContentAsString());

        MvcResult result = mockMvc.perform(get("/api/grns/{id}/labels/print-data", grnId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(200, result.getResponse().getStatus(), result.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(grnId.toString(), root.get("grnId").asText());
        assertEquals("RECEIVED", root.get("status").asText());
        assertEquals(2, root.get("entries").size());
        JsonNode firstEntry = root.get("entries").get(0);
        assertEquals("In House Label Material", firstEntry.get("materialName").asText());
        assertEquals("PALLET-" + fixture.suffix(), firstEntry.get("palletCode").asText());
        assertEquals("IN_HOUSE_RECEIPT", firstEntry.get("labelType").asText());
        assertTrue(firstEntry.get("labelContent").asText().contains("In-house Batch No"));
    }

    @Test
    void cancellingCancelledGrnReturnsConflict() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-CANCEL-" + UUID.randomUUID().toString().substring(0, 8), token);

        MvcResult cancelResult = mockMvc.perform(post("/api/grns/{id}/cancel", grnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "updatedBy": "admin",
                                  "reason": "Vendor document mismatch"
                                }
                                """))
                .andReturn();
        assertEquals(200, cancelResult.getResponse().getStatus(), cancelResult.getResponse().getContentAsString());
        JsonNode cancelledRoot = objectMapper.readTree(cancelResult.getResponse().getContentAsString());
        assertTrue(cancelledRoot.get("remarks").asText().contains("Cancellation reason: Vendor document mismatch"));

        MvcResult repeatedCancel = mockMvc.perform(post("/api/grns/{id}/cancel", grnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "updatedBy": "admin"
                                }
                                """))
                .andReturn();

        assertEquals(409, repeatedCancel.getResponse().getStatus(), repeatedCancel.getResponse().getContentAsString());
    }

    @Test
    void deactivatingDraftGrnAlsoDeactivatesItemsAndDocuments() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-DEACT-" + UUID.randomUUID().toString().substring(0, 8), token);

        GrnItem item = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grnId).get(0);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "coa.pdf",
                "application/pdf",
                "fixture-pdf".getBytes()
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/grns/items/{grnItemId}/documents", item.getId())
                        .file(file)
                        .param("documentName", "Vendor CoA")
                        .param("documentType", "COA")
                        .param("createdBy", "admin")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, uploadResult.getResponse().getStatus(), uploadResult.getResponse().getContentAsString());

        MvcResult deactivateResult = mockMvc.perform(delete("/api/grns/{id}", grnId)
                        .header("Authorization", "Bearer " + token)
                        .param("updatedBy", "admin"))
                .andReturn();
        assertEquals(204, deactivateResult.getResponse().getStatus(), deactivateResult.getResponse().getContentAsString());

        Grn grn = grnRepository.findById(grnId).orElseThrow();
        assertEquals(false, grn.getIsActive());
        assertTrue(grnItemRepository.findByGrnIdOrderByLineNumber(grnId).stream().allMatch(itemRow -> !itemRow.getIsActive()));
        List<GrnDocument> documents = grnDocumentRepository.findAll().stream()
                .filter(document -> document.getGrnId().equals(grnId))
                .toList();
        assertEquals(1, documents.size());
        assertTrue(documents.stream().allMatch(document -> !document.getIsActive()));
    }

    @Test
    void receivedGrnCannotBeCancelledOrDeactivatedAndKeepsDownstreamRecords() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-LOCK-" + UUID.randomUUID().toString().substring(0, 8), token);
        receiveGrn(grnId, token);

        long baselineInventoryTransactions = inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> grnId.equals(transaction.getReferenceId())
                        && transaction.getReferenceType() == InventoryReferenceType.GRN)
                .count();
        int baselineSamplingRequests = samplingRequestRepository.findByGrnIdAndIsActiveTrue(grnId).size();

        MvcResult cancelResult = mockMvc.perform(post("/api/grns/{id}/cancel", grnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "updatedBy": "admin"
                                }
                                """))
                .andReturn();
        assertEquals(409, cancelResult.getResponse().getStatus(), cancelResult.getResponse().getContentAsString());

        MvcResult deactivateResult = mockMvc.perform(delete("/api/grns/{id}", grnId)
                        .header("Authorization", "Bearer " + token)
                        .param("updatedBy", "admin"))
                .andReturn();
        assertEquals(409, deactivateResult.getResponse().getStatus(), deactivateResult.getResponse().getContentAsString());

        assertEquals(baselineInventoryTransactions, inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> grnId.equals(transaction.getReferenceId())
                        && transaction.getReferenceType() == InventoryReferenceType.GRN)
                .count());
        assertEquals(baselineSamplingRequests, samplingRequestRepository.findByGrnIdAndIsActiveTrue(grnId).size());
    }

    @Test
    void updatingDraftGrnDeactivatesSupersededItemsAndDocuments() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-UPD-" + UUID.randomUUID().toString().substring(0, 8), token);

        GrnItem originalItem = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grnId).get(0);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "spec.pdf",
                "application/pdf",
                "fixture-pdf".getBytes()
        );
        MvcResult uploadResult = mockMvc.perform(multipart("/api/grns/items/{grnItemId}/documents", originalItem.getId())
                        .file(file)
                        .param("documentName", "Vendor Specification")
                        .param("documentType", "SPEC")
                        .param("createdBy", "admin")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, uploadResult.getResponse().getStatus(), uploadResult.getResponse().getContentAsString());

        MvcResult updateResult = mockMvc.perform(put("/api/grns/{id}", grnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "grnNumber": "GRN-UPD-FINAL-%s",
                                  "supplierId": "%s",
                                  "vendorId": "%s",
                                  "vendorBusinessUnitId": "%s",
                                  "receiptDate": "%s",
                                  "invoiceNumber": "INV-UPD-%s",
                                  "remarks": "Updated draft GRN",
                                  "updatedBy": "admin",
                                  "items": [
                                    {
                                      "materialId": "%s",
                                      "receivedQuantity": 12.000,
                                      "acceptedQuantity": 12.000,
                                      "rejectedQuantity": 0.000,
                                      "uom": "KG",
                                      "palletId": "%s",
                                      "containerType": "BOX",
                                      "numberOfContainers": 3,
                                      "quantityPerContainer": 4.000,
                                      "vendorBatch": "VB-UPD-%s",
                                      "manufactureDate": "%s",
                                      "expiryDate": "%s",
                                      "retestDate": "%s",
                                      "unitPrice": 111.00,
                                      "qcStatus": "PENDING",
                                      "description": "Updated line"
                                    }
                                  ]
                                }
                                """.formatted(
                                fixture.suffix(),
                                fixture.supplier().getId(),
                                fixture.vendor().getId(),
                                fixture.vendorBusinessUnit().getId(),
                                LocalDate.now(),
                                fixture.suffix(),
                                fixture.material().getId(),
                                fixture.pallet().getId(),
                                fixture.suffix(),
                                LocalDate.now().minusDays(5),
                                LocalDate.now().plusMonths(8),
                                LocalDate.now().plusMonths(4)
                        )))
                .andReturn();

        assertEquals(200, updateResult.getResponse().getStatus(), updateResult.getResponse().getContentAsString());
        List<GrnItem> allItems = grnItemRepository.findByGrnIdOrderByLineNumber(grnId);
        assertEquals(1, allItems.size());
        assertEquals(1, allItems.stream().filter(GrnItem::getIsActive).count());
        assertTrue(allItems.stream().noneMatch(item -> item.getId().equals(originalItem.getId())));

        List<GrnDocument> documents = grnDocumentRepository.findAll().stream()
                .filter(document -> document.getGrnId().equals(grnId))
                .toList();
        assertEquals(0, documents.size());
    }

    @Test
    void repeatedSamplingLabelApplicationReturnsConflict() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-SAMPLE-" + UUID.randomUUID().toString().substring(0, 8), token);
        receiveGrn(grnId, token);
        UUID containerId = grnContainerRepository.findByGrnIdAndIsActiveTrueOrderByContainerNumber(grnId).get(0).getId();

        MvcResult firstApply = mockMvc.perform(post("/api/grns/containers/{containerId}/sampling-label", containerId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sampledQuantity": 1.000,
                                  "samplingLocation": "QC Booth 1",
                                  "sampledBy": "admin"
                                }
                                """))
                .andReturn();
        assertEquals(200, firstApply.getResponse().getStatus(), firstApply.getResponse().getContentAsString());

        MvcResult repeatedApply = mockMvc.perform(post("/api/grns/containers/{containerId}/sampling-label", containerId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sampledQuantity": 0.500,
                                  "samplingLocation": "QC Booth 2",
                                  "sampledBy": "admin"
                                }
                                """))
                .andReturn();
        assertEquals(409, repeatedApply.getResponse().getStatus(), repeatedApply.getResponse().getContentAsString());
    }

    @Test
    void uploadDocumentRejectsBlankDocumentNameAfterTrim() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-DOC-" + UUID.randomUUID().toString().substring(0, 8), token);
        GrnItem item = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grnId).get(0);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "coa.pdf",
                "application/pdf",
                "fixture-pdf".getBytes()
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/grns/items/{grnItemId}/documents", item.getId())
                        .file(file)
                        .param("documentName", "   ")
                        .param("documentType", "COA")
                        .param("createdBy", "admin")
                        .header("Authorization", "Bearer " + token))
                .andReturn();

        assertEquals(409, uploadResult.getResponse().getStatus(), uploadResult.getResponse().getContentAsString());
    }

    @Test
    void grnLevelDocumentAndLabelEndpointsReturnAggregatedResults() throws Exception {
        FixtureData fixture = createFixtureData();
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();
        UUID grnId = createGrn(fixture, "GRN-READ-" + UUID.randomUUID().toString().substring(0, 8), token);
        GrnItem item = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grnId).get(0);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "coa.pdf",
                "application/pdf",
                "fixture-pdf".getBytes()
        );
        MvcResult uploadResult = mockMvc.perform(multipart("/api/grns/items/{grnItemId}/documents", item.getId())
                        .file(file)
                        .param("documentName", "Vendor CoA")
                        .param("documentType", "COA")
                        .param("createdBy", "admin")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, uploadResult.getResponse().getStatus(), uploadResult.getResponse().getContentAsString());

        receiveGrn(grnId, token);

        MvcResult documentResult = mockMvc.perform(get("/api/grns/{id}/documents", grnId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, documentResult.getResponse().getStatus(), documentResult.getResponse().getContentAsString());
        JsonNode documentsRoot = objectMapper.readTree(documentResult.getResponse().getContentAsString());
        assertEquals(1, documentsRoot.size());
        assertEquals(item.getId().toString(), documentsRoot.get(0).get("grnItemId").asText());

        MvcResult labelResult = mockMvc.perform(get("/api/grns/{id}/labels", grnId)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        assertEquals(200, labelResult.getResponse().getStatus(), labelResult.getResponse().getContentAsString());
        JsonNode labelsRoot = objectMapper.readTree(labelResult.getResponse().getContentAsString());
        assertEquals(2, labelsRoot.size());
        assertEquals("IN_HOUSE_RECEIPT", labelsRoot.get(0).get("labelType").asText());
    }

    @Test
    void receivingMultiItemGrnCreatesExpectedContainersLabelsSamplingAndInventoryTransactions() throws Exception {
        FixtureData fixture = createFixtureData();
        Material secondMaterial = createMaterial("MAT2-" + fixture.suffix(), "Aux Material " + fixture.suffix());
        SecurityContextHolder.clearContext();
        String token = loginAsAdmin();

        UUID grnId = createMultiItemGrn(fixture, secondMaterial, "GRN-MULTI-" + UUID.randomUUID().toString().substring(0, 8), token);
        MvcResult receiveResult = receiveGrn(grnId, token);
        assertEquals(200, receiveResult.getResponse().getStatus(), receiveResult.getResponse().getContentAsString());

        assertEquals(5, grnContainerRepository.findByGrnIdAndIsActiveTrueOrderByContainerNumber(grnId).size());
        List<UUID> containerIds = grnContainerRepository.findByGrnIdAndIsActiveTrueOrderByContainerNumber(grnId).stream()
                .map(container -> container.getId())
                .toList();
        long labelCount = materialLabelRepository.findAll().stream()
                .filter(label -> containerIds.contains(label.getGrnContainerId()))
                .count();
        assertEquals(5, labelCount);
        assertEquals(2, samplingRequestRepository.findByGrnIdAndIsActiveTrue(grnId).size());
        long inboundTransactions = inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> grnId.equals(transaction.getReferenceId())
                        && transaction.getReferenceType() == InventoryReferenceType.GRN
                        && transaction.getTransactionType() == InventoryTransactionType.INBOUND)
                .count();
        assertEquals(2, inboundTransactions);
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

    private void setFixtureAuthentication() {
        AuthenticatedUser fixtureUser = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("grn-fixture")
                .email("grn-fixture@batchsphere.local")
                .passwordHash("ignored")
                .role(UserRole.SUPER_ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(fixtureUser, null, fixtureUser.getAuthorities())
        );
    }

    private FixtureData createFixtureData() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode("SUP-" + suffix)
                .supplierName("Supplier " + suffix)
                .contactPerson("Fixture User")
                .email("supplier-" + suffix + "@example.com")
                .phone("9999999999")
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VEND-" + suffix)
                .vendorName("Vendor " + suffix)
                .contactPerson("Fixture User")
                .email("vendor-" + suffix + "@example.com")
                .phone("9999999999")
                .isApproved(true)
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        VendorBusinessUnit vendorBusinessUnit = vendorBusinessUnitRepository.save(VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendor.getId())
                .unitName("VBU " + suffix)
                .address("Test Address")
                .city("Hyderabad")
                .state("TS")
                .country("India")
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-" + suffix)
                .materialName("In House Label Material")
                .materialType("RAW_MATERIAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(false)
                .samplingRequired(true)
                .description("GRN test material")
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());

        Pallet pallet = createPalletHierarchy(suffix);
        return new FixtureData(suffix, supplier, vendor, vendorBusinessUnit, material, pallet);
    }

    private UUID createGrn(FixtureData fixture, String grnNumber, String token) throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/grns")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "grnNumber": "%s",
                                  "supplierId": "%s",
                                  "vendorId": "%s",
                                  "vendorBusinessUnitId": "%s",
                                  "receiptDate": "%s",
                                  "invoiceNumber": "INV-%s",
                                  "remarks": "GRN integration test",
                                  "createdBy": "admin",
                                  "items": [
                                    {
                                      "materialId": "%s",
                                      "receivedQuantity": 20.000,
                                      "acceptedQuantity": 20.000,
                                      "rejectedQuantity": 0.000,
                                      "uom": "KG",
                                      "palletId": "%s",
                                      "containerType": "BAG",
                                      "numberOfContainers": 2,
                                      "quantityPerContainer": 10.000,
                                      "vendorBatch": "VB-%s",
                                      "manufactureDate": "%s",
                                      "expiryDate": "%s",
                                      "retestDate": "%s",
                                      "unitPrice": 100.00,
                                      "qcStatus": "PENDING",
                                      "description": "Test line"
                                    }
                                  ]
                                }
                                """.formatted(
                                grnNumber,
                                fixture.supplier().getId(),
                                fixture.vendor().getId(),
                                fixture.vendorBusinessUnit().getId(),
                                LocalDate.now(),
                                fixture.suffix(),
                                fixture.material().getId(),
                                fixture.pallet().getId(),
                                fixture.suffix(),
                                LocalDate.now().minusDays(7),
                                LocalDate.now().plusMonths(12),
                                LocalDate.now().plusMonths(6)
                        )))
                .andReturn();

        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(createResult.getResponse().getContentAsString());
        return UUID.fromString(root.get("id").asText());
    }

    private UUID createMultiItemGrn(FixtureData fixture, Material secondMaterial, String grnNumber, String token) throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/grns")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "grnNumber": "%s",
                                  "supplierId": "%s",
                                  "vendorId": "%s",
                                  "vendorBusinessUnitId": "%s",
                                  "receiptDate": "%s",
                                  "invoiceNumber": "INV-%s",
                                  "remarks": "Multi-item GRN integration test",
                                  "createdBy": "admin",
                                  "items": [
                                    {
                                      "materialId": "%s",
                                      "receivedQuantity": 20.000,
                                      "acceptedQuantity": 20.000,
                                      "rejectedQuantity": 0.000,
                                      "uom": "KG",
                                      "palletId": "%s",
                                      "containerType": "BAG",
                                      "numberOfContainers": 2,
                                      "quantityPerContainer": 10.000,
                                      "vendorBatch": "VB-%s-A",
                                      "manufactureDate": "%s",
                                      "expiryDate": "%s",
                                      "retestDate": "%s",
                                      "unitPrice": 100.00,
                                      "qcStatus": "PENDING",
                                      "description": "Primary line"
                                    },
                                    {
                                      "materialId": "%s",
                                      "receivedQuantity": 9.000,
                                      "acceptedQuantity": 9.000,
                                      "rejectedQuantity": 0.000,
                                      "uom": "KG",
                                      "palletId": "%s",
                                      "containerType": "DRUM",
                                      "numberOfContainers": 3,
                                      "quantityPerContainer": 3.000,
                                      "vendorBatch": "VB-%s-B",
                                      "manufactureDate": "%s",
                                      "expiryDate": "%s",
                                      "retestDate": "%s",
                                      "unitPrice": 60.00,
                                      "qcStatus": "PENDING",
                                      "description": "Secondary line"
                                    }
                                  ]
                                }
                                """.formatted(
                                grnNumber,
                                fixture.supplier().getId(),
                                fixture.vendor().getId(),
                                fixture.vendorBusinessUnit().getId(),
                                LocalDate.now(),
                                fixture.suffix(),
                                fixture.material().getId(),
                                fixture.pallet().getId(),
                                fixture.suffix(),
                                LocalDate.now().minusDays(7),
                                LocalDate.now().plusMonths(12),
                                LocalDate.now().plusMonths(6),
                                secondMaterial.getId(),
                                fixture.pallet().getId(),
                                fixture.suffix(),
                                LocalDate.now().minusDays(3),
                                LocalDate.now().plusMonths(10),
                                LocalDate.now().plusMonths(5)
                        )))
                .andReturn();

        assertEquals(200, createResult.getResponse().getStatus(), createResult.getResponse().getContentAsString());
        JsonNode root = objectMapper.readTree(createResult.getResponse().getContentAsString());
        return UUID.fromString(root.get("id").asText());
    }

    private MvcResult receiveGrn(UUID grnId, String token) throws Exception {
        return mockMvc.perform(post("/api/grns/{id}/receive", grnId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "updatedBy": "admin"
                                }
                                """))
                .andReturn();
    }

    private Material createMaterial(String materialCode, String materialName) {
        return materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode(materialCode)
                .materialName(materialName)
                .materialType("RAW_MATERIAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(false)
                .samplingRequired(true)
                .description("GRN test material")
                .isActive(true)
                .createdBy("seed-user")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private Pallet createPalletHierarchy(String suffix) {
        CreateWarehouseRequest warehouseRequest = new CreateWarehouseRequest();
        warehouseRequest.setWarehouseCode("WH-" + suffix);
        warehouseRequest.setWarehouseName("Warehouse " + suffix);
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

    private record FixtureData(
            String suffix,
            Supplier supplier,
            Vendor vendor,
            VendorBusinessUnit vendorBusinessUnit,
            Material material,
            Pallet pallet
    ) {
    }
}
