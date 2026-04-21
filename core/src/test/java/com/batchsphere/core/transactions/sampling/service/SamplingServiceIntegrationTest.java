package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.entity.BatchType;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import com.batchsphere.core.masterdata.samplingtool.repository.SamplingToolRepository;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
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
import com.batchsphere.core.transactions.sampling.dto.CreateSamplingPlanRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleRequest;
import com.batchsphere.core.transactions.grn.entity.ContainerType;
import com.batchsphere.core.transactions.grn.entity.GrnContainer;
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import com.batchsphere.core.transactions.grn.entity.QcStatus;
import com.batchsphere.core.transactions.grn.entity.LabelStatus;
import com.batchsphere.core.transactions.grn.repository.GrnContainerRepository;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import com.batchsphere.core.transactions.sampling.entity.SampleType;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import com.batchsphere.core.transactions.sampling.entity.SamplingContainerSample;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import com.batchsphere.core.transactions.sampling.dto.QcDecisionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingCompletionRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingSummaryResponse;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingPlanRepository;
import com.batchsphere.core.transactions.sampling.repository.SamplingContainerSampleRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class SamplingServiceIntegrationTest {

    @Autowired
    private SamplingService samplingService;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private SpecRepository specRepository;

    @Autowired
    private MoaRepository moaRepository;

    @Autowired
    private SamplingToolRepository samplingToolRepository;

    @Autowired
    private SamplingRequestRepository samplingRequestRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private VendorBusinessUnitRepository vendorBusinessUnitRepository;

    @Autowired
    private GrnRepository grnRepository;

    @Autowired
    private GrnItemRepository grnItemRepository;

    @Autowired
    private GrnContainerRepository grnContainerRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private SamplingPlanRepository samplingPlanRepository;

    @Autowired
    private SamplingContainerSampleRepository samplingContainerSampleRepository;

    @Autowired
    private WarehouseLocationService warehouseLocationService;

    @BeforeEach
    void setUpAuthentication() {
        AuthenticatedUser user = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username("sampling-tester")
                .email("sampling-tester@batchsphere.local")
                .passwordHash("ignored")
                .role(UserRole.QC_ANALYST)
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
    void allowsCoaBasedReleaseForNonCriticalMaterialWithoutSamplingCalculations() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-COA-" + suffix)
                .materialName("Non Critical Material")
                .materialType("NON_CRITICAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(true)
                .samplingRequired(true)
                .description("test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Spec spec = specRepository.save(Spec.builder()
                .id(UUID.randomUUID())
                .specCode("SPEC-COA-" + suffix)
                .specName("COA Spec")
                .samplingMethod(SamplingMethod.COA_BASED_RELEASE)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-" + suffix)
                .moaName("MOA")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        SamplingTool tool = samplingToolRepository.save(SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode("TOOL-" + suffix)
                .toolName("Tool")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode("SUP-" + suffix)
                .supplierName("Supplier")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VEN-" + suffix)
                .vendorName("Vendor")
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        VendorBusinessUnit businessUnit = vendorBusinessUnitRepository.save(VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendor.getId())
                .unitName("Unit 1")
                .city("Chennai")
                .country("India")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest(suffix));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest(suffix));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest(suffix));
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest(suffix));

        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-" + suffix)
                .supplierId(supplier.getId())
                .vendorId(vendor.getId())
                .vendorBusinessUnitId(businessUnit.getId())
                .receiptDate(LocalDate.now())
                .invoiceNumber("INV-" + suffix)
                .remarks("test")
                .status(GrnStatus.RECEIVED)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        GrnItem grnItem = grnItemRepository.save(GrnItem.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .lineNumber(1)
                .materialId(material.getId())
                .batchId(null)
                .receivedQuantity(new BigDecimal("100.000"))
                .acceptedQuantity(new BigDecimal("100.000"))
                .rejectedQuantity(BigDecimal.ZERO.setScale(3))
                .uom("KG")
                .warehouseLocation("WH1/ROOM1/RACK1/SHELF1/PALLET1")
                .palletId(pallet.getId())
                .containerType(ContainerType.BAG)
                .numberOfContainers(10)
                .quantityPerContainer(new BigDecimal("10.000"))
                .vendorBatch("VB-" + suffix)
                .unitPrice(new BigDecimal("1.00"))
                .totalPrice(new BigDecimal("100.00"))
                .qcStatus(QcStatus.PENDING)
                .description("test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .materialId(material.getId())
                .batchId(null)
                .warehouseLocation(grnItem.getWarehouseLocation())
                .palletId(pallet.getId())
                .totalContainers(10)
                .requestStatus(SamplingRequestStatus.REQUESTED)
                .warehouseLabelApplied(true)
                .samplingLabelRequired(true)
                .vendorCoaReleaseAllowed(true)
                .photosensitiveMaterial(false)
                .hygroscopicMaterial(false)
                .hazardousMaterial(false)
                .selectiveMaterial(false)
                .remarks("test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.COA_BASED_RELEASE);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(spec.getId());
        request.setMoaId(moa.getId());
        request.setTotalContainers(10);
        request.setContainersToSample(0);
        request.setIndividualSampleQuantity(java.math.BigDecimal.ZERO);
        request.setCompositeSampleQuantity(java.math.BigDecimal.ZERO);
        request.setSamplingLocation("Warehouse Desk");
        request.setAnalystEmployeeCode("EMP001");
        request.setSamplingToolId(tool.getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(true);
        request.setRationale("Vendor COA based release");
        request.setContainerSamples(List.of());
        request.setCreatedBy("tester");

        SamplingRequestResponse response = samplingService.createSamplingPlan(samplingRequest.getId(), request);

        assertNotNull(response.getPlan());
        assertEquals(SamplingMethod.COA_BASED_RELEASE, response.getPlan().getSamplingMethod());
        assertEquals(0, response.getPlan().getContainersToSample());
        assertEquals(SamplingRequestStatus.PLAN_DEFINED, response.getRequestStatus());
        assertTrue(response.getPlan().getCoaBasedRelease());
        assertTrue(response.getPlan().getContainerSamples().isEmpty());
        assertEquals("sampling-tester", response.getPlan().getCreatedBy());
    }

    @Test
    void completingSamplingReconcilesContainerQuantityAndPreventsPrematureQcDecision() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-FLOW-" + suffix)
                .materialName("Flow Material")
                .materialType("CRITICAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(false)
                .samplingRequired(true)
                .description("flow test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Spec spec = specRepository.save(Spec.builder()
                .id(UUID.randomUUID())
                .specCode("SPEC-FLOW-" + suffix)
                .specName("Flow Spec")
                .samplingMethod(SamplingMethod.HUNDRED_PERCENT)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-FLOW-" + suffix)
                .moaName("MOA Flow")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        SamplingTool tool = samplingToolRepository.save(SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode("TOOL-FLOW-" + suffix)
                .toolName("Flow Tool")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode("SUP-FLOW-" + suffix)
                .supplierName("Supplier Flow")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VEN-FLOW-" + suffix)
                .vendorName("Vendor Flow")
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        VendorBusinessUnit businessUnit = vendorBusinessUnitRepository.save(VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendor.getId())
                .unitName("Unit Flow")
                .city("Chennai")
                .country("India")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest(suffix));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest(suffix));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest(suffix));
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest(suffix));

        Batch batch = batchRepository.save(Batch.builder()
                .id(UUID.randomUUID())
                .batchNumber("BATCH-FLOW-" + suffix)
                .material(material)
                .batchType(BatchType.RAW_MATERIAL)
                .batchStatus(BatchStatus.QUARANTINE)
                .quantity(new BigDecimal("10.000"))
                .unitOfMeasure("KG")
                .manufactureDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusMonths(12))
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        inventoryRepository.save(Inventory.builder()
                .id(UUID.randomUUID())
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation("WH/ROOM/RACK/SHELF/PALLET")
                .palletId(pallet.getId())
                .quantityOnHand(new BigDecimal("10.000"))
                .uom("KG")
                .status(InventoryStatus.QUARANTINE)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-FLOW-" + suffix)
                .supplierId(supplier.getId())
                .vendorId(vendor.getId())
                .vendorBusinessUnitId(businessUnit.getId())
                .receiptDate(LocalDate.now())
                .invoiceNumber("INV-FLOW-" + suffix)
                .remarks("test")
                .status(GrnStatus.RECEIVED)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        GrnItem grnItem = grnItemRepository.save(GrnItem.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .lineNumber(1)
                .materialId(material.getId())
                .batchId(batch.getId())
                .receivedQuantity(new BigDecimal("10.000"))
                .acceptedQuantity(new BigDecimal("10.000"))
                .rejectedQuantity(BigDecimal.ZERO.setScale(3))
                .uom("KG")
                .warehouseLocation("WH/ROOM/RACK/SHELF/PALLET")
                .palletId(pallet.getId())
                .containerType(ContainerType.BAG)
                .numberOfContainers(1)
                .quantityPerContainer(new BigDecimal("10.000"))
                .vendorBatch("VB-FLOW-" + suffix)
                .unitPrice(new BigDecimal("1.00"))
                .totalPrice(new BigDecimal("10.00"))
                .qcStatus(QcStatus.PENDING)
                .description("test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        GrnContainer container = grnContainerRepository.save(GrnContainer.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .materialId(material.getId())
                .batchId(batch.getId())
                .palletId(pallet.getId())
                .containerNumber("C1")
                .containerType(ContainerType.BAG)
                .vendorBatch("VB-FLOW-" + suffix)
                .internalLot("LOT-FLOW-" + suffix)
                .quantity(new BigDecimal("10.000"))
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .inventoryStatus(InventoryStatus.QUARANTINE)
                .labelStatus(LabelStatus.GENERATED)
                .sampled(false)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation(grnItem.getWarehouseLocation())
                .palletId(pallet.getId())
                .totalContainers(1)
                .requestStatus(SamplingRequestStatus.REQUESTED)
                .warehouseLabelApplied(true)
                .samplingLabelRequired(true)
                .vendorCoaReleaseAllowed(false)
                .photosensitiveMaterial(false)
                .hygroscopicMaterial(false)
                .hazardousMaterial(false)
                .selectiveMaterial(false)
                .remarks("test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(spec.getId());
        request.setMoaId(moa.getId());
        request.setTotalContainers(1);
        request.setContainersToSample(1);
        request.setIndividualSampleQuantity(new BigDecimal("1.000"));
        request.setCompositeSampleQuantity(new BigDecimal("1.000"));
        request.setSamplingLocation("QC Booth");
        request.setAnalystEmployeeCode("EMP002");
        request.setSamplingToolId(tool.getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setContainerSamples(List.of(sampleRequest(container.getId(), "1.000")));
        request.setCreatedBy("tester");

        SamplingRequestResponse planned = samplingService.createSamplingPlan(samplingRequest.getId(), request);
        assertEquals(SamplingRequestStatus.PLAN_DEFINED, planned.getRequestStatus());

        QcDecisionRequest prematureDecision = new QcDecisionRequest();
        prematureDecision.setApproved(true);
        prematureDecision.setRemarks("approved");
        prematureDecision.setUpdatedBy("tester");
        assertThrows(BusinessConflictException.class,
                () -> samplingService.recordQcDecision(samplingRequest.getId(), prematureDecision));

        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        SamplingRequestResponse completed = samplingService.completeSampling(samplingRequest.getId(), completionRequest);
        assertEquals(SamplingRequestStatus.UNDER_TEST, completed.getRequestStatus());

        GrnContainer updatedContainer = grnContainerRepository.findById(container.getId()).orElseThrow();
        assertEquals(new BigDecimal("9.000"), updatedContainer.getQuantity());
        assertEquals(new BigDecimal("1.000"), updatedContainer.getSampledQuantity());
        assertEquals(InventoryStatus.UNDER_TEST, updatedContainer.getInventoryStatus());

        QcDecisionRequest finalDecision = new QcDecisionRequest();
        finalDecision.setApproved(true);
        finalDecision.setRemarks("meets specification");
        finalDecision.setUpdatedBy("tester");
        SamplingRequestResponse approved = samplingService.recordQcDecision(samplingRequest.getId(), finalDecision);
        assertEquals(SamplingRequestStatus.APPROVED, approved.getRequestStatus());

        SamplingSummaryResponse summary = samplingService.getSamplingSummary();
        assertTrue(summary.countsByStatus().get(SamplingRequestStatus.APPROVED) >= 1);
    }

    @Test
    void coaBasedQcDecisionReleasesInventoryWithoutSamplingCompletion() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SamplingWorkflowFixture fixture = createWorkflowFixture(
                suffix,
                SamplingMethod.COA_BASED_RELEASE,
                "NON_CRITICAL",
                true,
                2,
                new BigDecimal("5.000")
        );

        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.COA_BASED_RELEASE);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(fixture.spec().getId());
        request.setMoaId(fixture.moa().getId());
        request.setTotalContainers(2);
        request.setContainersToSample(0);
        request.setIndividualSampleQuantity(BigDecimal.ZERO);
        request.setCompositeSampleQuantity(BigDecimal.ZERO);
        request.setSamplingLocation("QA Desk");
        request.setAnalystEmployeeCode("EMP-COA");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(true);
        request.setRationale("Vendor CoA accepted");
        request.setContainerSamples(List.of());
        request.setCreatedBy("tester");

        SamplingRequestResponse planned = samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
        assertEquals(SamplingRequestStatus.PLAN_DEFINED, planned.getRequestStatus());

        QcDecisionRequest decision = new QcDecisionRequest();
        decision.setApproved(true);
        decision.setRemarks("Vendor CoA verified");
        decision.setUpdatedBy("tester");

        SamplingRequestResponse approved = samplingService.recordQcDecision(fixture.samplingRequest().getId(), decision);
        assertEquals(SamplingRequestStatus.APPROVED, approved.getRequestStatus());

        Inventory inventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        fixture.material().getId(),
                        fixture.batch().getId(),
                        fixture.pallet().getId()
                )
                .orElseThrow();
        assertEquals(InventoryStatus.RELEASED, inventory.getStatus());
    }

    @Test
    void rejectedQcDecisionMarksInventoryRejected() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SamplingWorkflowFixture fixture = createWorkflowFixture(
                suffix,
                SamplingMethod.HUNDRED_PERCENT,
                "CRITICAL",
                false,
                1,
                new BigDecimal("10.000")
        );

        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(fixture.spec().getId());
        request.setMoaId(fixture.moa().getId());
        request.setTotalContainers(1);
        request.setContainersToSample(1);
        request.setIndividualSampleQuantity(new BigDecimal("1.000"));
        request.setCompositeSampleQuantity(new BigDecimal("1.000"));
        request.setSamplingLocation("QC Booth");
        request.setAnalystEmployeeCode("EMP-REJ");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Routine testing");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);

        QcDecisionRequest decision = new QcDecisionRequest();
        decision.setApproved(false);
        decision.setRemarks("Out of specification");
        decision.setUpdatedBy("tester");

        SamplingRequestResponse rejected = samplingService.recordQcDecision(fixture.samplingRequest().getId(), decision);
        assertEquals(SamplingRequestStatus.REJECTED, rejected.getRequestStatus());

        Inventory inventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        fixture.material().getId(),
                        fixture.batch().getId(),
                        fixture.pallet().getId()
                )
                .orElseThrow();
        assertEquals(InventoryStatus.REJECTED, inventory.getStatus());
    }

    @Test
    void rejectsSamplingPlanContainersThatDoNotBelongToSamplingRequest() {
        String primarySuffix = UUID.randomUUID().toString().substring(0, 8);
        String secondarySuffix = UUID.randomUUID().toString().substring(0, 8);
        SamplingWorkflowFixture primaryFixture = createWorkflowFixture(
                primarySuffix,
                SamplingMethod.HUNDRED_PERCENT,
                "CRITICAL",
                false,
                1,
                new BigDecimal("10.000")
        );
        SamplingWorkflowFixture secondaryFixture = createWorkflowFixture(
                secondarySuffix,
                SamplingMethod.HUNDRED_PERCENT,
                "CRITICAL",
                false,
                1,
                new BigDecimal("8.000")
        );

        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(primaryFixture.spec().getId());
        request.setMoaId(primaryFixture.moa().getId());
        request.setTotalContainers(1);
        request.setContainersToSample(1);
        request.setIndividualSampleQuantity(new BigDecimal("1.000"));
        request.setCompositeSampleQuantity(new BigDecimal("1.000"));
        request.setSamplingLocation("QC Booth");
        request.setAnalystEmployeeCode("EMP-OWN");
        request.setSamplingToolId(primaryFixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Ownership validation");
        request.setContainerSamples(List.of(sampleRequest(secondaryFixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        assertThrows(BusinessConflictException.class,
                () -> samplingService.createSamplingPlan(primaryFixture.samplingRequest().getId(), request));
    }

    private SamplingContainerSampleRequest sampleRequest(UUID grnContainerId, String quantity) {
        SamplingContainerSampleRequest request = new SamplingContainerSampleRequest();
        request.setGrnContainerId(grnContainerId);
        request.setSampledQuantity(new BigDecimal(quantity));
        return request;
    }

    private CreateWarehouseRequest createWarehouseRequest(String suffix) {
        CreateWarehouseRequest request = new CreateWarehouseRequest();
        request.setWarehouseCode("WH-" + suffix);
        request.setWarehouseName("Warehouse");
        request.setCreatedBy("tester");
        return request;
    }

    private CreateRoomRequest createRoomRequest(String suffix) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomCode("ROOM-" + suffix);
        request.setRoomName("Room");
        request.setStorageCondition(StorageCondition.ROOM_TEMPERATURE);
        request.setCreatedBy("tester");
        return request;
    }

    private CreateRackRequest createRackRequest(String suffix) {
        CreateRackRequest request = new CreateRackRequest();
        request.setRackCode("RACK-" + suffix);
        request.setRackName("Rack");
        request.setCreatedBy("tester");
        return request;
    }

    private CreateShelfRequest createShelfRequest(String suffix) {
        CreateShelfRequest request = new CreateShelfRequest();
        request.setShelfCode("SHELF-" + suffix);
        request.setShelfName("Shelf");
        request.setCreatedBy("tester");
        return request;
    }

    private CreatePalletRequest createPalletRequest(String suffix) {
        CreatePalletRequest request = new CreatePalletRequest();
        request.setPalletCode("PALLET-" + suffix);
        request.setPalletName("Pallet");
        request.setCreatedBy("tester");
        return request;
    }

    private SamplingWorkflowFixture createWorkflowFixture(String suffix,
                                                         SamplingMethod specMethod,
                                                         String materialType,
                                                         boolean vendorCoaReleaseAllowed,
                                                         int totalContainers,
                                                         BigDecimal quantityPerContainer) {
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-" + suffix)
                .materialName("Material " + suffix)
                .materialType(materialType)
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(vendorCoaReleaseAllowed)
                .samplingRequired(true)
                .description("fixture")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Spec spec = specRepository.save(Spec.builder()
                .id(UUID.randomUUID())
                .specCode("SPEC-" + suffix)
                .specName("Spec " + suffix)
                .samplingMethod(specMethod)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-" + suffix)
                .moaName("MOA " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        SamplingTool tool = samplingToolRepository.save(SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode("TOOL-" + suffix)
                .toolName("Tool " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode("SUP-" + suffix)
                .supplierName("Supplier " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VEN-" + suffix)
                .vendorName("Vendor " + suffix)
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        VendorBusinessUnit businessUnit = vendorBusinessUnitRepository.save(VendorBusinessUnit.builder()
                .id(UUID.randomUUID())
                .vendorId(vendor.getId())
                .unitName("Unit " + suffix)
                .city("Chennai")
                .country("India")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix));
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest(suffix));
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest(suffix));
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest(suffix));
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest(suffix));

        BigDecimal totalQuantity = quantityPerContainer.multiply(BigDecimal.valueOf(totalContainers)).setScale(3);
        Batch batch = batchRepository.save(Batch.builder()
                .id(UUID.randomUUID())
                .batchNumber("BATCH-" + suffix)
                .material(material)
                .batchType(BatchType.RAW_MATERIAL)
                .batchStatus(BatchStatus.QUARANTINE)
                .quantity(totalQuantity)
                .unitOfMeasure("KG")
                .manufactureDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusMonths(12))
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        inventoryRepository.save(Inventory.builder()
                .id(UUID.randomUUID())
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation("WH/ROOM/RACK/SHELF/PALLET")
                .palletId(pallet.getId())
                .quantityOnHand(totalQuantity)
                .uom("KG")
                .status(InventoryStatus.QUARANTINE)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-" + suffix)
                .supplierId(supplier.getId())
                .vendorId(vendor.getId())
                .vendorBusinessUnitId(businessUnit.getId())
                .receiptDate(LocalDate.now())
                .invoiceNumber("INV-" + suffix)
                .remarks("fixture")
                .status(GrnStatus.RECEIVED)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        GrnItem grnItem = grnItemRepository.save(GrnItem.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .lineNumber(1)
                .materialId(material.getId())
                .batchId(batch.getId())
                .receivedQuantity(totalQuantity)
                .acceptedQuantity(totalQuantity)
                .rejectedQuantity(BigDecimal.ZERO.setScale(3))
                .uom("KG")
                .warehouseLocation("WH/ROOM/RACK/SHELF/PALLET")
                .palletId(pallet.getId())
                .containerType(ContainerType.BAG)
                .numberOfContainers(totalContainers)
                .quantityPerContainer(quantityPerContainer)
                .vendorBatch("VB-" + suffix)
                .unitPrice(new BigDecimal("1.00"))
                .totalPrice(totalQuantity)
                .qcStatus(QcStatus.PENDING)
                .description("fixture")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        List<GrnContainer> containers = new java.util.ArrayList<>();
        for (int index = 1; index <= totalContainers; index++) {
            containers.add(grnContainerRepository.save(GrnContainer.builder()
                    .id(UUID.randomUUID())
                    .grnId(grn.getId())
                    .grnItemId(grnItem.getId())
                    .materialId(material.getId())
                    .batchId(batch.getId())
                    .palletId(pallet.getId())
                    .containerNumber("C" + index)
                    .containerType(ContainerType.BAG)
                    .vendorBatch("VB-" + suffix)
                    .internalLot("LOT-" + suffix + "-" + index)
                    .quantity(quantityPerContainer)
                    .uom("KG")
                    .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                    .inventoryStatus(InventoryStatus.QUARANTINE)
                    .labelStatus(LabelStatus.GENERATED)
                    .sampled(false)
                    .isActive(true)
                    .createdBy("tester")
                    .createdAt(LocalDateTime.now())
                    .build()));
        }

        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(UUID.randomUUID())
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .materialId(material.getId())
                .batchId(batch.getId())
                .warehouseLocation(grnItem.getWarehouseLocation())
                .palletId(pallet.getId())
                .totalContainers(totalContainers)
                .requestStatus(SamplingRequestStatus.REQUESTED)
                .warehouseLabelApplied(true)
                .samplingLabelRequired(true)
                .vendorCoaReleaseAllowed(vendorCoaReleaseAllowed)
                .photosensitiveMaterial(false)
                .hygroscopicMaterial(false)
                .hazardousMaterial(false)
                .selectiveMaterial(false)
                .remarks("fixture")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        return new SamplingWorkflowFixture(material, spec, moa, tool, pallet, batch, samplingRequest, containers);
    }

    private record SamplingWorkflowFixture(
            Material material,
            Spec spec,
            Moa moa,
            SamplingTool tool,
            Pallet pallet,
            Batch batch,
            SamplingRequest samplingRequest,
            List<GrnContainer> containers
    ) {
    }
}
