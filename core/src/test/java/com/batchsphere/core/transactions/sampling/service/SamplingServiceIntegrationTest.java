package com.batchsphere.core.transactions.sampling.service;

import com.batchsphere.core.auth.entity.User;
import com.batchsphere.core.auth.entity.UserRole;
import com.batchsphere.core.auth.security.AuthenticatedUser;
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
import com.batchsphere.core.transactions.grn.entity.ContainerType;
import com.batchsphere.core.transactions.grn.entity.Grn;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import com.batchsphere.core.transactions.grn.entity.QcStatus;
import com.batchsphere.core.transactions.grn.repository.GrnItemRepository;
import com.batchsphere.core.transactions.grn.repository.GrnRepository;
import com.batchsphere.core.transactions.sampling.entity.SampleType;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequest;
import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import com.batchsphere.core.transactions.sampling.repository.SamplingRequestRepository;
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
        Material material = materialRepository.save(Material.builder()
                .id(UUID.randomUUID())
                .materialCode("MAT-COA")
                .materialName("Non Critical Material")
                .materialType("NON_CRITICAL")
                .uom("KG")
                .storageCondition(StorageCondition.ROOM_TEMPERATURE)
                .photosensitive(false)
                .hygroscopic(false)
                .hazardous(false)
                .selectiveMaterial(false)
                .vendorCoaReleaseAllowed(false)
                .samplingRequired(true)
                .description("test")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Spec spec = specRepository.save(Spec.builder()
                .id(UUID.randomUUID())
                .specCode("SPEC-COA")
                .specName("COA Spec")
                .samplingMethod(SamplingMethod.COA_BASED_RELEASE)
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Moa moa = moaRepository.save(Moa.builder()
                .id(UUID.randomUUID())
                .moaCode("MOA-1")
                .moaName("MOA")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        SamplingTool tool = samplingToolRepository.save(SamplingTool.builder()
                .id(UUID.randomUUID())
                .toolCode("TOOL-1")
                .toolName("Tool")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .id(UUID.randomUUID())
                .supplierCode("SUP-1")
                .supplierName("Supplier")
                .isActive(true)
                .createdBy("tester")
                .createdAt(LocalDateTime.now())
                .build());

        Vendor vendor = vendorRepository.save(Vendor.builder()
                .id(UUID.randomUUID())
                .vendorCode("VEN-1")
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

        Warehouse warehouse = warehouseLocationService.createWarehouse(createWarehouseRequest());
        Room room = warehouseLocationService.createRoom(warehouse.getId(), createRoomRequest());
        Rack rack = warehouseLocationService.createRack(room.getId(), createRackRequest());
        Shelf shelf = warehouseLocationService.createShelf(rack.getId(), createShelfRequest());
        Pallet pallet = warehouseLocationService.createPallet(shelf.getId(), createPalletRequest());

        Grn grn = grnRepository.save(Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber("GRN-1")
                .supplierId(supplier.getId())
                .vendorId(vendor.getId())
                .vendorBusinessUnitId(businessUnit.getId())
                .receiptDate(LocalDate.now())
                .invoiceNumber("INV-1")
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
                .vendorBatch("VB-1")
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

    private CreateWarehouseRequest createWarehouseRequest() {
        CreateWarehouseRequest request = new CreateWarehouseRequest();
        request.setWarehouseCode("WH-COA");
        request.setWarehouseName("Warehouse");
        request.setCreatedBy("tester");
        return request;
    }

    private CreateRoomRequest createRoomRequest() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setRoomCode("ROOM-COA");
        request.setRoomName("Room");
        request.setStorageCondition(StorageCondition.ROOM_TEMPERATURE);
        request.setCreatedBy("tester");
        return request;
    }

    private CreateRackRequest createRackRequest() {
        CreateRackRequest request = new CreateRackRequest();
        request.setRackCode("RACK-COA");
        request.setRackName("Rack");
        request.setCreatedBy("tester");
        return request;
    }

    private CreateShelfRequest createShelfRequest() {
        CreateShelfRequest request = new CreateShelfRequest();
        request.setShelfCode("SHELF-COA");
        request.setShelfName("Shelf");
        request.setCreatedBy("tester");
        return request;
    }

    private CreatePalletRequest createPalletRequest() {
        CreatePalletRequest request = new CreatePalletRequest();
        request.setPalletCode("PALLET-COA");
        request.setPalletName("Pallet");
        request.setCreatedBy("tester");
        return request;
    }
}
