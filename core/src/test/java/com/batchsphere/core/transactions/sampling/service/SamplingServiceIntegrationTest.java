package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.entity.BatchType;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.masterdata.businessunit.entity.BusinessUnit;
import com.batchsphere.core.masterdata.businessunit.repository.BusinessUnitRepository;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.entity.MoaStatus;
import com.batchsphere.core.masterdata.moa.entity.MoaValidationStatus;
import com.batchsphere.core.masterdata.moa.repository.MoaRepository;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import com.batchsphere.core.masterdata.samplingtool.repository.SamplingToolRepository;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterTestType;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.entity.SpecStatus;
import com.batchsphere.core.masterdata.spec.entity.SpecType;
import com.batchsphere.core.masterdata.spec.repository.MaterialSpecLinkRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecParameterRepository;
import com.batchsphere.core.masterdata.spec.repository.SpecRepository;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.QualificationStatus;
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
import com.batchsphere.core.transactions.sampling.dto.CompleteQaInvestigationReviewRequest;
import com.batchsphere.core.transactions.sampling.dto.DestroyRetainedSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.EscalateQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.ExecuteResampleRequest;
import com.batchsphere.core.transactions.sampling.dto.ExecuteRetestRequest;
import com.batchsphere.core.transactions.sampling.dto.OpenQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.QcReceiptRequest;
import com.batchsphere.core.transactions.sampling.dto.QcInvestigationResponse;
import com.batchsphere.core.transactions.sampling.dto.RecordQcTestResultRequest;
import com.batchsphere.core.transactions.sampling.dto.ResolveQcInvestigationRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingRequestResponse;
import com.batchsphere.core.transactions.sampling.dto.SamplingContainerSampleRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingHandoffRequest;
import com.batchsphere.core.transactions.sampling.dto.SamplingStartRequest;
import com.batchsphere.core.transactions.sampling.dto.StartQcReviewRequest;
import com.batchsphere.core.transactions.sampling.dto.UpdateSamplingPlanRequest;
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
import com.batchsphere.core.transactions.inventory.entity.InventoryReferenceType;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransaction;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransactionType;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import com.batchsphere.core.transactions.inventory.repository.InventoryTransactionRepository;
import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationOutcome;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationPhase;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import com.batchsphere.core.transactions.sampling.entity.SampleStatus;
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
import com.batchsphere.core.transactions.sampling.repository.SampleContainerLinkRepository;
import com.batchsphere.core.transactions.sampling.repository.SampleRepository;
import com.batchsphere.core.transactions.sampling.repository.QcDispositionRepository;
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
import static org.junit.jupiter.api.Assertions.assertNull;
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
    private MaterialSpecLinkRepository materialSpecLinkRepository;

    @Autowired
    private SpecParameterRepository specParameterRepository;

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
    private BusinessUnitRepository businessUnitRepository;

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
    private InventoryTransactionRepository inventoryTransactionRepository;

    @Autowired
    private SamplingPlanRepository samplingPlanRepository;

    @Autowired
    private SamplingContainerSampleRepository samplingContainerSampleRepository;

    @Autowired
    private SampleRepository sampleRepository;

    @Autowired
    private SampleContainerLinkRepository sampleContainerLinkRepository;

    @Autowired
    private QcDispositionRepository qcDispositionRepository;

    @Autowired
    private WarehouseLocationService warehouseLocationService;

    @BeforeEach
    void setUpAuthentication() {
        setAuthenticatedRole(UserRole.QC_ANALYST, "sampling-tester");
    }

    private void setAuthenticatedRole(UserRole role, String username) {
        AuthenticatedUser user = new AuthenticatedUser(User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email(username + "@batchsphere.local")
                .passwordHash("ignored")
                .role(role)
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
                .revision("v1")
                .specType(SpecType.MATERIAL)
                .status(SpecStatus.APPROVED)
                .samplingMethod(SamplingMethod.COA_BASED_RELEASE)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createActiveMaterialSpecLink(material.getId(), spec.getId(), "tester");

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-" + suffix)
                .moaName("MOA")
                .revision("v1")
                .validationStatus(MoaValidationStatus.VALIDATED)
                .status(MoaStatus.APPROVED)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createMandatorySpecParameter(spec.getId(), moa.getId(), suffix);

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
                .isWhoGmpCertified(false)
                .isUsfda(false)
                .isEuGmp(false)
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        BusinessUnit warehouseBusinessUnit = createBusinessUnit(suffix);
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix, warehouseBusinessUnit.getId()));
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

        UUID rootRequestId = UUID.randomUUID();
        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(rootRequestId)
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .parentSamplingRequestId(null)
                .rootSamplingRequestId(rootRequestId)
                .cycleNumber(1)
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
    void criticalMaterialUsesApprovedSpecSamplingMethodInsteadOfForcedHundredPercent() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SamplingWorkflowFixture fixture = createWorkflowFixture(
                suffix,
                SamplingMethod.SQRT_N_PLUS_1,
                "CRITICAL",
                false,
                10,
                new BigDecimal("10.000")
        );

        CreateSamplingPlanRequest request = new CreateSamplingPlanRequest();
        request.setSamplingMethod(SamplingMethod.SQRT_N_PLUS_1);
        request.setSampleType(SampleType.COMPOSITE);
        request.setSpecId(fixture.spec().getId());
        request.setMoaId(fixture.moa().getId());
        request.setTotalContainers(10);
        request.setContainersToSample(5);
        request.setIndividualSampleQuantity(new BigDecimal("1.000"));
        request.setCompositeSampleQuantity(new BigDecimal("4.000"));
        request.setSamplingLocation("QC Desk");
        request.setAnalystEmployeeCode("EMP-SYNC");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Use approved spec sampling method");
        request.setContainerSamples(List.of(
                sampleRequest(fixture.containers().get(0).getId(), "1.000"),
                sampleRequest(fixture.containers().get(1).getId(), "1.000"),
                sampleRequest(fixture.containers().get(2).getId(), "1.000"),
                sampleRequest(fixture.containers().get(3).getId(), "1.000"),
                sampleRequest(fixture.containers().get(4).getId(), "1.000")
        ));
        request.setCreatedBy("tester");

        SamplingRequestResponse response = samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);

        assertEquals(SamplingMethod.SQRT_N_PLUS_1, response.getPlan().getSamplingMethod());
        assertEquals(5, response.getPlan().getContainersToSample());
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
                .revision("v1")
                .specType(SpecType.MATERIAL)
                .status(SpecStatus.APPROVED)
                .samplingMethod(SamplingMethod.HUNDRED_PERCENT)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createActiveMaterialSpecLink(material.getId(), spec.getId(), "tester");

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-FLOW-" + suffix)
                .moaName("MOA Flow")
                .revision("v1")
                .validationStatus(MoaValidationStatus.VALIDATED)
                .status(MoaStatus.APPROVED)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createMandatorySpecParameter(spec.getId(), moa.getId(), suffix);

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
                .isWhoGmpCertified(false)
                .isUsfda(false)
                .isEuGmp(false)
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        BusinessUnit warehouseBusinessUnit = createBusinessUnit("FLOW-" + suffix);
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix, warehouseBusinessUnit.getId()));
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

        UUID rootRequestId = UUID.randomUUID();
        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(rootRequestId)
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .parentSamplingRequestId(null)
                .rootSamplingRequestId(rootRequestId)
                .cycleNumber(1)
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
        prematureDecision.setConfirmedBy("sampling-tester");
        prematureDecision.setConfirmationText("I APPROVE THIS FINAL QC DECISION");
        assertThrows(BusinessConflictException.class,
                () -> samplingService.recordQcDecision(samplingRequest.getId(), prematureDecision));

        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        SamplingRequestResponse started = samplingService.startSampling(samplingRequest.getId(), startRequest);
        assertEquals(SamplingRequestStatus.IN_PROGRESS, started.getRequestStatus());

        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        SamplingRequestResponse completed = samplingService.completeSampling(samplingRequest.getId(), completionRequest);
        assertEquals(SamplingRequestStatus.SAMPLED, completed.getRequestStatus());
        assertNotNull(completed.getSample());
        assertEquals(SampleStatus.COLLECTED, completed.getSample().getSampleStatus());
        assertEquals(new BigDecimal("1.000"), completed.getSample().getSampleQuantity());
        assertEquals(1, completed.getSample().getContainerLinks().size());

        QcDecisionRequest stillPrematureDecision = new QcDecisionRequest();
        stillPrematureDecision.setApproved(true);
        stillPrematureDecision.setRemarks("approved");
        stillPrematureDecision.setUpdatedBy("tester");
        stillPrematureDecision.setConfirmedBy("sampling-tester");
        stillPrematureDecision.setConfirmationText("I APPROVE THIS FINAL QC DECISION");
        assertThrows(BusinessConflictException.class,
                () -> samplingService.recordQcDecision(samplingRequest.getId(), stillPrematureDecision));

        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        SamplingRequestResponse handedOff = samplingService.handoffToQc(samplingRequest.getId(), handoffRequest);
        assertEquals(SamplingRequestStatus.HANDED_TO_QC, handedOff.getRequestStatus());
        assertNotNull(handedOff.getSample());
        assertEquals(SampleStatus.HANDED_TO_QC, handedOff.getSample().getSampleStatus());
        assertNotNull(handedOff.getQcDisposition());
        assertEquals(QcDispositionStatus.PENDING, handedOff.getQcDisposition().getStatus());

        List<InventoryTransaction> statusTransactionsAfterCompletion = inventoryTransactionRepository.findAll().stream()
                .filter(transaction -> transaction.getReferenceType() == InventoryReferenceType.SAMPLING_REQUEST)
                .filter(transaction -> transaction.getReferenceId().equals(samplingRequest.getId()))
                .filter(transaction -> transaction.getTransactionType() == InventoryTransactionType.STATUS_CHANGE)
                .toList();
        assertEquals(2, statusTransactionsAfterCompletion.size());
        assertTrue(statusTransactionsAfterCompletion.stream()
                .anyMatch(transaction -> transaction.getRemarks().contains("to SAMPLING")));
        assertTrue(statusTransactionsAfterCompletion.stream()
                .anyMatch(transaction -> transaction.getRemarks().contains("to UNDER_TEST")));

        GrnContainer updatedContainer = grnContainerRepository.findById(container.getId()).orElseThrow();
        assertEquals(new BigDecimal("9.000"), updatedContainer.getQuantity());
        assertEquals(new BigDecimal("1.000"), updatedContainer.getSampledQuantity());
        assertEquals(InventoryStatus.UNDER_TEST, updatedContainer.getInventoryStatus());
        UUID sampleId = sampleRepository.findBySamplingRequestId(samplingRequest.getId()).orElseThrow().getId();
        assertEquals(1, sampleContainerLinkRepository.findBySampleIdOrderByContainerNumber(sampleId).size());

        receiveAndStartQcReview(samplingRequest.getId(), "EMP-TEST");
        recordFirstWorksheetResult(samplingRequest.getId(), new BigDecimal("99.0000"));

        setAuthenticatedRole(UserRole.QC_MANAGER, "qc-final-approver");
        QcDecisionRequest finalDecision = createQcDecisionRequest(true, "meets specification", "tester", "qc-final-approver");
        SamplingRequestResponse approved = samplingService.recordQcDecision(samplingRequest.getId(), finalDecision);
        assertEquals(SamplingRequestStatus.COMPLETED, approved.getRequestStatus());
        assertNotNull(approved.getSample());
        assertEquals(SampleStatus.APPROVED, approved.getSample().getSampleStatus());
        assertNotNull(approved.getQcDisposition());
        assertEquals(QcDispositionStatus.APPROVED, approved.getQcDisposition().getStatus());

        SamplingSummaryResponse summary = samplingService.getSamplingSummary();
        assertTrue(summary.countsByStatus().get(SamplingRequestStatus.COMPLETED) >= 1);
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

        setAuthenticatedRole(UserRole.QC_MANAGER, "qc-final-approver");
        QcDecisionRequest decision = createQcDecisionRequest(true, "Vendor CoA verified", "tester", "qc-final-approver");

        SamplingRequestResponse approved = samplingService.recordQcDecision(fixture.samplingRequest().getId(), decision);
        assertEquals(SamplingRequestStatus.COMPLETED, approved.getRequestStatus());
        assertNull(approved.getSample());
        assertNotNull(approved.getQcDisposition());
        assertEquals(QcDispositionStatus.APPROVED, approved.getQcDisposition().getStatus());

        Inventory inventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        fixture.material().getId(),
                        fixture.batch().getId(),
                        fixture.pallet().getId()
                )
                .orElseThrow();
        assertEquals(InventoryStatus.RELEASED, inventory.getStatus());
        assertTrue(inventoryTransactionRepository.findAll().stream()
                .anyMatch(transaction -> transaction.getReferenceType() == InventoryReferenceType.SAMPLING_REQUEST
                        && transaction.getReferenceId().equals(fixture.samplingRequest().getId())
                        && transaction.getTransactionType() == InventoryTransactionType.STATUS_CHANGE
                        && transaction.getRemarks().contains("to RELEASED")));
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
        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(fixture.samplingRequest().getId(), startRequest);
        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);
        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(fixture.samplingRequest().getId(), handoffRequest);
        receiveAndStartQcReview(fixture.samplingRequest().getId(), "EMP-REJ");
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Assay failed initial review");
        openRequest.setInitialAssessment("Analyst escalation");
        samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RESUME_REVIEW);
        resolveRequest.setRootCause("No assignable laboratory error confirmed");
        resolveRequest.setResolutionRemarks("Investigation completed and batch decision can proceed");
        samplingService.resolveInvestigation(fixture.samplingRequest().getId(), samplingService.getInvestigations(fixture.samplingRequest().getId()).get(0).getId(), resolveRequest);
        setAuthenticatedRole(UserRole.QC_MANAGER, "qa-approver");
        CompleteQaInvestigationReviewRequest qaReviewRequest = createQaReviewRequest(true, "QA approves investigation closure", "qa-approver");
        samplingService.completeQaInvestigationReview(
                fixture.samplingRequest().getId(),
                samplingService.getInvestigations(fixture.samplingRequest().getId()).get(0).getId(),
                qaReviewRequest
        );

        QcDecisionRequest decision = createQcDecisionRequest(false, "Out of specification", "tester", "qa-approver");

        SamplingRequestResponse rejected = samplingService.recordQcDecision(fixture.samplingRequest().getId(), decision);
        assertEquals(SamplingRequestStatus.COMPLETED, rejected.getRequestStatus());
        assertNotNull(rejected.getSample());
        assertEquals(SampleStatus.REJECTED, rejected.getSample().getSampleStatus());
        assertNotNull(rejected.getQcDisposition());
        assertEquals(QcDispositionStatus.REJECTED, rejected.getQcDisposition().getStatus());

        Inventory inventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        fixture.material().getId(),
                        fixture.batch().getId(),
                        fixture.pallet().getId()
                )
                .orElseThrow();
        assertEquals(InventoryStatus.REJECTED, inventory.getStatus());
        assertTrue(inventoryTransactionRepository.findAll().stream()
                .anyMatch(transaction -> transaction.getReferenceType() == InventoryReferenceType.SAMPLING_REQUEST
                        && transaction.getReferenceId().equals(fixture.samplingRequest().getId())
                        && transaction.getTransactionType() == InventoryTransactionType.STATUS_CHANGE
                        && transaction.getRemarks().contains("to REJECTED")));
    }

    @Test
    void investigationCanResumeReviewBeforeFinalApproval() {
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
        request.setAnalystEmployeeCode("EMP-INV");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Investigation flow");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(fixture.samplingRequest().getId(), startRequest);
        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);
        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(fixture.samplingRequest().getId(), handoffRequest);

        receiveAndStartQcReview(fixture.samplingRequest().getId(), "EMP-INV");
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Initial assay below range");
        openRequest.setInitialAssessment("Retest preparation review required");
        openRequest.setInvestigationType(QcInvestigationType.OOS);
        QcInvestigationResponse opened = samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);
        assertTrue(opened.getInvestigationNumber().startsWith("QCINV-"));
        assertEquals(QcInvestigationType.OOS, opened.getInvestigationType());
        assertEquals(QcInvestigationPhase.PHASE_I, opened.getPhase());

        SamplingRequestResponse underInvestigation = samplingService.getSamplingRequestById(fixture.samplingRequest().getId());
        assertEquals(SamplingRequestStatus.UNDER_INVESTIGATION, underInvestigation.getRequestStatus());
        assertNotNull(underInvestigation.getQcDisposition());
        assertEquals(QcDispositionStatus.UNDER_INVESTIGATION, underInvestigation.getQcDisposition().getStatus());
        assertEquals(InventoryStatus.BLOCKED, getInventoryForRequest(fixture.samplingRequest()).getStatus());

        EscalateQcInvestigationRequest escalateRequest = new EscalateQcInvestigationRequest();
        escalateRequest.setPhaseTwoAssessment("No assignable cause found in Phase I; broadening scope");
        QcInvestigationResponse escalated = samplingService.escalateInvestigationToPhaseTwo(
                fixture.samplingRequest().getId(),
                opened.getId(),
                escalateRequest
        );
        assertEquals(QcInvestigationPhase.PHASE_II, escalated.getPhase());
        assertEquals("No assignable cause found in Phase I; broadening scope", escalated.getPhaseTwoAssessment());

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RESUME_REVIEW);
        resolveRequest.setRootCause("Worksheet entry issue corrected during investigation");
        resolveRequest.setResolutionRemarks("Resume review and update final result");
        QcInvestigationResponse pendingQa = samplingService.resolveInvestigation(fixture.samplingRequest().getId(), opened.getId(), resolveRequest);
        assertEquals(QcInvestigationStatus.QA_REVIEW_PENDING, pendingQa.getStatus());

        setAuthenticatedRole(UserRole.QC_MANAGER, "qa-approver");
        CompleteQaInvestigationReviewRequest qaReviewRequest = createQaReviewRequest(true, "QA agrees with invalidation and review resumption", "qa-approver");
        QcInvestigationResponse approvedInvestigation = samplingService.completeQaInvestigationReview(
                fixture.samplingRequest().getId(),
                opened.getId(),
                qaReviewRequest
        );
        assertEquals(QcInvestigationStatus.CLOSED_INVALID, approvedInvestigation.getStatus());
        assertEquals("qa-approver", approvedInvestigation.getQaReviewedBy());
        assertEquals("QA agrees with invalidation and review resumption", approvedInvestigation.getQaReviewRemarks());

        SamplingRequestResponse resumed = samplingService.getSamplingRequestById(fixture.samplingRequest().getId());
        assertEquals(SamplingRequestStatus.UNDER_REVIEW, resumed.getRequestStatus());
        assertNotNull(resumed.getQcDisposition());
        assertEquals(QcDispositionStatus.UNDER_REVIEW, resumed.getQcDisposition().getStatus());
        assertEquals(InventoryStatus.UNDER_TEST, getInventoryForRequest(fixture.samplingRequest()).getStatus());

        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("99.0000"));

        QcDecisionRequest decision = createQcDecisionRequest(true, "Approved after investigation closure", "tester", "qa-approver");
        SamplingRequestResponse approved = samplingService.recordQcDecision(fixture.samplingRequest().getId(), decision);

        assertEquals(SamplingRequestStatus.COMPLETED, approved.getRequestStatus());
        assertNotNull(approved.getQcDisposition());
        assertEquals(QcDispositionStatus.APPROVED, approved.getQcDisposition().getStatus());
        assertEquals(SampleStatus.APPROVED, approved.getSample().getSampleStatus());
    }

    @Test
    void investigationCanTriggerRetestUsingRetainedSample() {
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
        request.setAnalystEmployeeCode("EMP-RT");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Retest flow");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(fixture.samplingRequest().getId(), startRequest);
        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);
        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(fixture.samplingRequest().getId(), handoffRequest);

        QcReceiptRequest receiptRequest = new QcReceiptRequest();
        receiptRequest.setReceivedBy("QC Analyst");
        receiptRequest.setReceiptCondition("Sealed and intact");
        receiptRequest.setSampleStorageLocation("QC Shelf A1");
        receiptRequest.setRetainedFlag(true);
        receiptRequest.setRetainedQuantity(new BigDecimal("0.250"));
        receiptRequest.setRetainedUntil(LocalDate.now().plusDays(30));
        samplingService.receiveInQc(fixture.samplingRequest().getId(), receiptRequest);

        StartQcReviewRequest reviewRequest = new StartQcReviewRequest();
        reviewRequest.setAnalystCode("EMP-RT");
        samplingService.startQcReview(fixture.samplingRequest().getId(), reviewRequest);

        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Initial assay below range");
        openRequest.setInitialAssessment("Retained sample retest required");
        QcInvestigationResponse opened = samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RETEST_REQUIRED);
        resolveRequest.setRootCause("Sample preparation inconsistency suspected");
        resolveRequest.setResolutionRemarks("Run retained sample retest");
        samplingService.resolveInvestigation(fixture.samplingRequest().getId(), opened.getId(), resolveRequest);
        setAuthenticatedRole(UserRole.QC_MANAGER, "qa-approver");
        CompleteQaInvestigationReviewRequest qaReviewRequest = createQaReviewRequest(true, "QA approves retained sample retest", "qa-approver");
        samplingService.completeQaInvestigationReview(fixture.samplingRequest().getId(), opened.getId(), qaReviewRequest);

        SamplingRequestResponse retestRequired = samplingService.getSamplingRequestById(fixture.samplingRequest().getId());
        assertEquals(SamplingRequestStatus.RETEST_REQUIRED, retestRequired.getRequestStatus());
        assertNotNull(retestRequired.getQcDisposition());
        assertEquals(QcDispositionStatus.RETEST_REQUIRED, retestRequired.getQcDisposition().getStatus());
        assertEquals(InventoryStatus.UNDER_TEST, getInventoryForRequest(fixture.samplingRequest()).getStatus());

        ExecuteRetestRequest retestRequest = new ExecuteRetestRequest();
        retestRequest.setAnalystCode("EMP-RT-2");
        retestRequest.setRemarks("Retained sample retest initiated");
        SamplingRequestResponse restarted = samplingService.executeRetest(fixture.samplingRequest().getId(), retestRequest);

        assertEquals(SamplingRequestStatus.UNDER_REVIEW, restarted.getRequestStatus());
        assertNotNull(restarted.getQcDisposition());
        assertEquals(QcDispositionStatus.UNDER_REVIEW, restarted.getQcDisposition().getStatus());
        assertNotNull(restarted.getSample());
        assertEquals(SampleStatus.UNDER_REVIEW, restarted.getSample().getSampleStatus());
        assertEquals(false, restarted.getSample().getRetainedFlag());
        assertEquals(true, restarted.getSample().getConsumedFlag());
        assertEquals(false, restarted.getSample().getDestroyedFlag());
        assertEquals(new BigDecimal("0.000"), restarted.getSample().getRetainedQuantity());
        assertTrue(restarted.getSample().getRemarks().contains("Retained sample consumed for retest"));

        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("99.0000"));

        setAuthenticatedRole(UserRole.QC_MANAGER, "qc-final-approver");
        QcDecisionRequest decision = createQcDecisionRequest(true, "Approved after retained sample retest", "tester", "qc-final-approver");
        SamplingRequestResponse approved = samplingService.recordQcDecision(fixture.samplingRequest().getId(), decision);

        assertEquals(SamplingRequestStatus.COMPLETED, approved.getRequestStatus());
        assertNotNull(approved.getQcDisposition());
        assertEquals(QcDispositionStatus.APPROVED, approved.getQcDisposition().getStatus());
        assertEquals(SampleStatus.APPROVED, approved.getSample().getSampleStatus());
    }

    @Test
    void retainedSampleCanBeDestroyedAndCannotBeRetestedAfterwards() {
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
        request.setAnalystEmployeeCode("EMP-RD");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Retained sample destruction flow");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(fixture.samplingRequest().getId(), startRequest);
        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);
        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(fixture.samplingRequest().getId(), handoffRequest);

        QcReceiptRequest receiptRequest = new QcReceiptRequest();
        receiptRequest.setReceivedBy("QC Analyst");
        receiptRequest.setReceiptCondition("Sealed and intact");
        receiptRequest.setSampleStorageLocation("QC Shelf B2");
        receiptRequest.setRetainedFlag(true);
        receiptRequest.setRetainedQuantity(new BigDecimal("0.300"));
        receiptRequest.setRetainedUntil(LocalDate.now().plusDays(45));
        samplingService.receiveInQc(fixture.samplingRequest().getId(), receiptRequest);

        DestroyRetainedSampleRequest destroyRequest = new DestroyRetainedSampleRequest();
        destroyRequest.setRemarks("Retention period cleanup");
        SamplingRequestResponse destroyed = samplingService.destroyRetainedSample(fixture.samplingRequest().getId(), destroyRequest);

        assertNotNull(destroyed.getSample());
        assertEquals(false, destroyed.getSample().getRetainedFlag());
        assertEquals(false, destroyed.getSample().getConsumedFlag());
        assertEquals(true, destroyed.getSample().getDestroyedFlag());
        assertEquals(new BigDecimal("0.000"), destroyed.getSample().getRetainedQuantity());
        assertTrue(destroyed.getSample().getRemarks().contains("Retained sample destroyed: Retention period cleanup"));

        StartQcReviewRequest reviewRequest = new StartQcReviewRequest();
        reviewRequest.setAnalystCode("EMP-RD");
        samplingService.startQcReview(fixture.samplingRequest().getId(), reviewRequest);
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Follow-up review after retained sample destruction");
        openRequest.setInitialAssessment("Retest should no longer be possible");
        QcInvestigationResponse opened = samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RETEST_REQUIRED);
       resolveRequest.setRootCause("Comparison retest requested");
        resolveRequest.setResolutionRemarks("Attempt retained sample retest");
        samplingService.resolveInvestigation(fixture.samplingRequest().getId(), opened.getId(), resolveRequest);
        setAuthenticatedRole(UserRole.QC_MANAGER, "qa-approver");
        CompleteQaInvestigationReviewRequest qaReviewRequest = createQaReviewRequest(true, "QA approves retest request", "qa-approver");
        samplingService.completeQaInvestigationReview(fixture.samplingRequest().getId(), opened.getId(), qaReviewRequest);

        ExecuteRetestRequest retestRequest = new ExecuteRetestRequest();
        retestRequest.setAnalystCode("EMP-RD-2");
        retestRequest.setRemarks("Retest should fail because retained sample was destroyed");
        assertThrows(BusinessConflictException.class,
                () -> samplingService.executeRetest(fixture.samplingRequest().getId(), retestRequest));
    }

    @Test
    void investigationCanCreateResampleChildCycle() {
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
        request.setAnalystEmployeeCode("EMP-RS");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Resample flow");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);
        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(fixture.samplingRequest().getId(), startRequest);
        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);
        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(fixture.samplingRequest().getId(), handoffRequest);
        receiveAndStartQcReview(fixture.samplingRequest().getId(), "EMP-RS");
        recordFirstWorksheetResult(fixture.samplingRequest().getId(), new BigDecimal("80.0000"));

        OpenQcInvestigationRequest openRequest = new OpenQcInvestigationRequest();
        openRequest.setQcTestResultId(getFirstWorksheetRowId(fixture.samplingRequest().getId()));
        openRequest.setReason("Fresh representative sample required");
        openRequest.setInitialAssessment("Material heterogeneity suspected");
        QcInvestigationResponse opened = samplingService.openInvestigation(fixture.samplingRequest().getId(), openRequest);
        assertEquals(InventoryStatus.BLOCKED, getInventoryForRequest(fixture.samplingRequest()).getStatus());

        ResolveQcInvestigationRequest resolveRequest = new ResolveQcInvestigationRequest();
        resolveRequest.setOutcome(QcInvestigationOutcome.RESAMPLE_REQUIRED);
        resolveRequest.setRootCause("Original sample may not be representative");
        resolveRequest.setResolutionRemarks("Create a new sampling cycle");
        samplingService.resolveInvestigation(fixture.samplingRequest().getId(), opened.getId(), resolveRequest);
        setAuthenticatedRole(UserRole.QC_MANAGER, "qa-approver");
        CompleteQaInvestigationReviewRequest qaReviewRequest = createQaReviewRequest(true, "QA approves new sampling cycle", "qa-approver");
        samplingService.completeQaInvestigationReview(fixture.samplingRequest().getId(), opened.getId(), qaReviewRequest);
        assertEquals(InventoryStatus.SAMPLING, getInventoryForRequest(fixture.samplingRequest()).getStatus());

        ExecuteResampleRequest resampleRequest = new ExecuteResampleRequest();
        resampleRequest.setReason("Representative resample approved by QC");
        SamplingRequestResponse child = samplingService.executeResample(fixture.samplingRequest().getId(), resampleRequest);
        SamplingRequestResponse parentAfterResample = samplingService.getSamplingRequestById(fixture.samplingRequest().getId());

        assertEquals(SamplingRequestStatus.REQUESTED, child.getRequestStatus());
        assertEquals(2, child.getCycleNumber());
        assertEquals(fixture.samplingRequest().getId(), child.getParentSamplingRequestId());
        assertEquals(fixture.samplingRequest().getId(), child.getRootSamplingRequestId());
        assertEquals("Representative resample approved by QC", child.getResampleReason());
        assertEquals(SamplingRequestStatus.RESAMPLED, parentAfterResample.getRequestStatus());
        assertTrue(parentAfterResample.getRemarks().contains("Superseded by resample child cycle"));

        List<SamplingRequestResponse> cycles = samplingService.getSamplingCycles(child.getId());
        assertEquals(2, cycles.size());
        assertEquals(1, cycles.get(0).getCycleNumber());
        assertEquals(fixture.samplingRequest().getId(), cycles.get(0).getId());
        assertEquals(SamplingRequestStatus.RESAMPLED, cycles.get(0).getRequestStatus());
        assertEquals(2, cycles.get(1).getCycleNumber());
        assertEquals(child.getId(), cycles.get(1).getId());

        assertThrows(BusinessConflictException.class,
                () -> samplingService.executeResample(fixture.samplingRequest().getId(), resampleRequest));

        CreateSamplingPlanRequest childPlan = new CreateSamplingPlanRequest();
        childPlan.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        childPlan.setSampleType(SampleType.COMPOSITE);
        childPlan.setSpecId(fixture.spec().getId());
        childPlan.setMoaId(fixture.moa().getId());
        childPlan.setTotalContainers(1);
        childPlan.setContainersToSample(1);
        childPlan.setIndividualSampleQuantity(new BigDecimal("0.500"));
        childPlan.setCompositeSampleQuantity(new BigDecimal("0.500"));
        childPlan.setSamplingLocation("QC Booth");
        childPlan.setAnalystEmployeeCode("EMP-RS-2");
        childPlan.setSamplingToolId(fixture.tool().getId());
        childPlan.setPhotosensitiveHandlingRequired(false);
        childPlan.setHygroscopicHandlingRequired(false);
        childPlan.setCoaBasedRelease(false);
        childPlan.setRationale("Child resample cycle");
        childPlan.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "0.500")));
        childPlan.setCreatedBy("tester");

        samplingService.createSamplingPlan(child.getId(), childPlan);
        samplingService.startSampling(child.getId(), startRequest);

        SamplingRequestResponse childInProgress = samplingService.getSamplingRequestById(child.getId());
        assertEquals(SamplingRequestStatus.IN_PROGRESS, childInProgress.getRequestStatus());

        Inventory inventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        fixture.material().getId(),
                        fixture.batch().getId(),
                        fixture.pallet().getId()
                )
                .orElseThrow();
        assertEquals(InventoryStatus.SAMPLING, inventory.getStatus());
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

    @Test
    void rejectsSamplingPlanWhenMaterialHasNoActiveSpecLink() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SamplingWorkflowFixture fixture = createWorkflowFixture(
                suffix,
                SamplingMethod.HUNDRED_PERCENT,
                "CRITICAL",
                false,
                1,
                new BigDecimal("10.000"),
                false
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
        request.setAnalystEmployeeCode("EMP-NOLINK");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Missing link check");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        BusinessConflictException error = assertThrows(BusinessConflictException.class,
                () -> samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request));
        assertTrue(error.getMessage().contains("No active material-spec link"));
    }

    @Test
    void qcReceiptCapturesRetainedSampleDetails() {
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
        request.setAnalystEmployeeCode("EMP-RET");
        request.setSamplingToolId(fixture.tool().getId());
        request.setPhotosensitiveHandlingRequired(false);
        request.setHygroscopicHandlingRequired(false);
        request.setCoaBasedRelease(false);
        request.setRationale("Retention capture");
        request.setContainerSamples(List.of(sampleRequest(fixture.containers().get(0).getId(), "1.000")));
        request.setCreatedBy("tester");

        samplingService.createSamplingPlan(fixture.samplingRequest().getId(), request);

        SamplingStartRequest startRequest = new SamplingStartRequest();
        startRequest.setUpdatedBy("tester");
        samplingService.startSampling(fixture.samplingRequest().getId(), startRequest);

        SamplingCompletionRequest completionRequest = new SamplingCompletionRequest();
        completionRequest.setUpdatedBy("tester");
        samplingService.completeSampling(fixture.samplingRequest().getId(), completionRequest);

        SamplingHandoffRequest handoffRequest = new SamplingHandoffRequest();
        handoffRequest.setUpdatedBy("tester");
        samplingService.handoffToQc(fixture.samplingRequest().getId(), handoffRequest);

        QcReceiptRequest receiptRequest = new QcReceiptRequest();
        receiptRequest.setReceivedBy("QC Analyst");
        receiptRequest.setReceiptCondition("Sealed and intact");
        receiptRequest.setSampleStorageLocation("QC Shelf A1");
        receiptRequest.setRetainedFlag(true);
        receiptRequest.setRetainedQuantity(new BigDecimal("0.250"));
        receiptRequest.setRetainedUntil(LocalDate.now().plusDays(30));

        SamplingRequestResponse received = samplingService.receiveInQc(fixture.samplingRequest().getId(), receiptRequest);
        assertEquals(SamplingRequestStatus.RECEIVED, received.getRequestStatus());
        assertNotNull(received.getSample());
        assertEquals(SampleStatus.RECEIVED, received.getSample().getSampleStatus());
        assertEquals(Boolean.TRUE, received.getSample().getRetainedFlag());
        assertEquals(new BigDecimal("0.250"), received.getSample().getRetainedQuantity());
        assertEquals(LocalDate.now().plusDays(30), received.getSample().getRetainedUntil());
        assertNotNull(received.getQcDisposition());
        assertEquals(QcDispositionStatus.RECEIVED, received.getQcDisposition().getStatus());
    }

    @Test
    void updateSamplingPlanReplacesExistingContainerSamplesWithoutDuplicateConstraint() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SamplingWorkflowFixture fixture = createWorkflowFixture(
                suffix,
                SamplingMethod.HUNDRED_PERCENT,
                "CRITICAL",
                false,
                2,
                new BigDecimal("10.000")
        );

        CreateSamplingPlanRequest createRequest = new CreateSamplingPlanRequest();
        createRequest.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        createRequest.setSampleType(SampleType.COMPOSITE);
        createRequest.setSpecId(fixture.spec().getId());
        createRequest.setMoaId(fixture.moa().getId());
        createRequest.setTotalContainers(2);
        createRequest.setContainersToSample(2);
        createRequest.setIndividualSampleQuantity(new BigDecimal("1.000"));
        createRequest.setCompositeSampleQuantity(new BigDecimal("2.000"));
        createRequest.setSamplingLocation("QC Booth");
        createRequest.setAnalystEmployeeCode("EMP-UPD-1");
        createRequest.setSamplingToolId(fixture.tool().getId());
        createRequest.setPhotosensitiveHandlingRequired(false);
        createRequest.setHygroscopicHandlingRequired(false);
        createRequest.setCoaBasedRelease(false);
        createRequest.setRationale("Initial plan");
        createRequest.setContainerSamples(List.of(
                sampleRequest(fixture.containers().get(0).getId(), "1.000"),
                sampleRequest(fixture.containers().get(1).getId(), "1.000")
        ));
        createRequest.setCreatedBy("tester");

        SamplingRequestResponse created = samplingService.createSamplingPlan(fixture.samplingRequest().getId(), createRequest);
        UUID planId = created.getPlan().getId();

        UpdateSamplingPlanRequest updateRequest = new UpdateSamplingPlanRequest();
        updateRequest.setSamplingMethod(SamplingMethod.HUNDRED_PERCENT);
        updateRequest.setSampleType(SampleType.COMPOSITE);
        updateRequest.setSpecId(fixture.spec().getId());
        updateRequest.setMoaId(fixture.moa().getId());
        updateRequest.setTotalContainers(2);
        updateRequest.setContainersToSample(2);
        updateRequest.setIndividualSampleQuantity(new BigDecimal("1.500"));
        updateRequest.setCompositeSampleQuantity(new BigDecimal("3.000"));
        updateRequest.setSamplingLocation("QC Booth Updated");
        updateRequest.setAnalystEmployeeCode("EMP-UPD-2");
        updateRequest.setSamplingToolId(fixture.tool().getId());
        updateRequest.setPhotosensitiveHandlingRequired(false);
        updateRequest.setHygroscopicHandlingRequired(false);
        updateRequest.setCoaBasedRelease(false);
        updateRequest.setRationale("Updated plan");
        updateRequest.setContainerSamples(List.of(
                sampleRequest(fixture.containers().get(0).getId(), "1.500"),
                sampleRequest(fixture.containers().get(1).getId(), "1.500")
        ));
        updateRequest.setUpdatedBy("tester");

        SamplingRequestResponse updated = samplingService.updateSamplingPlan(
                fixture.samplingRequest().getId(),
                planId,
                updateRequest
        );

        assertEquals("QC Booth Updated", updated.getPlan().getSamplingLocation());
        assertEquals("EMP-UPD-2", updated.getPlan().getAnalystEmployeeCode());
        assertEquals(new BigDecimal("3.000"), updated.getPlan().getCompositeSampleQuantity());

        List<SamplingContainerSample> containerSamples = samplingContainerSampleRepository.findBySamplingPlanIdOrderByContainerNumber(planId);
        assertEquals(2, containerSamples.size());
        assertEquals(new BigDecimal("1.500"), containerSamples.get(0).getSampledQuantity());
        assertEquals(new BigDecimal("1.500"), containerSamples.get(1).getSampledQuantity());
    }

    private SamplingContainerSampleRequest sampleRequest(UUID grnContainerId, String quantity) {
        SamplingContainerSampleRequest request = new SamplingContainerSampleRequest();
        request.setGrnContainerId(grnContainerId);
        request.setSampledQuantity(new BigDecimal(quantity));
        return request;
    }

    private CreateWarehouseRequest createWarehouseRequest(String suffix, UUID businessUnitId) {
        CreateWarehouseRequest request = new CreateWarehouseRequest();
        request.setWarehouseCode("WH-" + suffix);
        request.setWarehouseName("Warehouse");
        request.setBusinessUnitId(businessUnitId);
        request.setCreatedBy("tester");
        return request;
    }

    private BusinessUnit createBusinessUnit(String suffix) {
        return businessUnitRepository.save(BusinessUnit.builder()
                .id(UUID.randomUUID())
                .unitCode("BU-" + suffix)
                .unitName("Business Unit " + suffix)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private SpecParameter createMandatorySpecParameter(UUID specId, UUID moaId, String suffix) {
        return specParameterRepository.save(SpecParameter.builder()
                .id(UUID.randomUUID())
                .specId(specId)
                .parameterName("Assay " + suffix)
                .testType(SpecParameterTestType.ASSAY)
                .moaId(moaId)
                .criteriaType(SpecParameterCriteriaType.RANGE)
                .lowerLimit(new BigDecimal("95.0000"))
                .upperLimit(new BigDecimal("105.0000"))
                .unit("%")
                .isMandatory(true)
                .sequence(1)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void receiveAndStartQcReview(UUID samplingRequestId, String analystCode) {
        QcReceiptRequest receiptRequest = new QcReceiptRequest();
        receiptRequest.setReceivedBy("QC Analyst");
        receiptRequest.setReceiptCondition("Sealed and intact");
        receiptRequest.setSampleStorageLocation("QC Shelf A1");
        samplingService.receiveInQc(samplingRequestId, receiptRequest);

        StartQcReviewRequest reviewRequest = new StartQcReviewRequest();
        reviewRequest.setAnalystCode(analystCode);
        samplingService.startQcReview(samplingRequestId, reviewRequest);
    }

    private void recordFirstWorksheetResult(UUID samplingRequestId, BigDecimal resultValue) {
        UUID worksheetRowId = getFirstWorksheetRowId(samplingRequestId);
        RecordQcTestResultRequest resultRequest = new RecordQcTestResultRequest();
        resultRequest.setResultValue(resultValue);
        samplingService.recordWorksheetResult(samplingRequestId, worksheetRowId, resultRequest);
    }

    private UUID getFirstWorksheetRowId(UUID samplingRequestId) {
        return samplingService.getWorksheet(samplingRequestId).stream()
                .findFirst()
                .orElseThrow()
                .getId();
    }

    private Inventory getInventoryForRequest(SamplingRequest samplingRequest) {
        return inventoryRepository.findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        samplingRequest.getMaterialId(),
                        samplingRequest.getBatchId(),
                        samplingRequest.getPalletId()
                )
                .orElseThrow();
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
        return createWorkflowFixture(suffix, specMethod, materialType, vendorCoaReleaseAllowed, totalContainers, quantityPerContainer, true);
    }

    private SamplingWorkflowFixture createWorkflowFixture(String suffix,
                                                         SamplingMethod specMethod,
                                                         String materialType,
                                                         boolean vendorCoaReleaseAllowed,
                                                         int totalContainers,
                                                         BigDecimal quantityPerContainer,
                                                         boolean createActiveSpecLink) {
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
                .revision("v1")
                .specType(SpecType.MATERIAL)
                .status(SpecStatus.APPROVED)
                .samplingMethod(specMethod)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        if (createActiveSpecLink) {
            createActiveMaterialSpecLink(material.getId(), spec.getId(), "tester");
        }

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-" + suffix)
                .moaName("MOA " + suffix)
                .revision("v1")
                .validationStatus(MoaValidationStatus.VALIDATED)
                .status(MoaStatus.APPROVED)
                .reviewRoute(ReviewRoute.QC_ONLY)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());
        createMandatorySpecParameter(spec.getId(), moa.getId(), suffix);

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
                .isWhoGmpCertified(false)
                .isUsfda(false)
                .isEuGmp(false)
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .isApproved(true)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        BusinessUnit warehouseBusinessUnit = createBusinessUnit(suffix);
        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest(suffix, warehouseBusinessUnit.getId()));
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

        UUID rootRequestId = UUID.randomUUID();
        SamplingRequest samplingRequest = samplingRequestRepository.save(SamplingRequest.builder()
                .id(rootRequestId)
                .grnId(grn.getId())
                .grnItemId(grnItem.getId())
                .parentSamplingRequestId(null)
                .rootSamplingRequestId(rootRequestId)
                .cycleNumber(1)
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

    private void createActiveMaterialSpecLink(UUID materialId, UUID specId, String actor) {
        materialSpecLinkRepository.save(MaterialSpecLink.builder()
                .id(UUID.randomUUID())
                .materialId(materialId)
                .specId(specId)
                .isActive(true)
                .linkedBy(actor)
                .linkedAt(LocalDateTime.now())
                .notes("Test fixture link")
                .createdAt(LocalDateTime.now())
                .build());
    }

    private CompleteQaInvestigationReviewRequest createQaReviewRequest(boolean approved, String remarks, String username) {
        CompleteQaInvestigationReviewRequest request = new CompleteQaInvestigationReviewRequest();
        request.setApproved(approved);
        request.setQaReviewRemarks(remarks);
        request.setConfirmedBy(username);
        request.setConfirmationText(approved
                ? "I APPROVE THIS QA REVIEW"
                : "I RETURN THIS INVESTIGATION TO QC");
        return request;
    }

    private QcDecisionRequest createQcDecisionRequest(boolean approved, String remarks, String updatedBy, String username) {
        QcDecisionRequest request = new QcDecisionRequest();
        request.setApproved(approved);
        request.setRemarks(remarks);
        request.setUpdatedBy(updatedBy);
        request.setConfirmedBy(username);
        request.setConfirmationText(approved
                ? "I APPROVE THIS FINAL QC DECISION"
                : "I REJECT THIS FINAL QC DECISION");
        return request;
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
