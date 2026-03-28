package com.batchsphere.core.transcations.grn.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.entity.BatchStatus;
import com.batchsphere.core.batch.entity.BatchType;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.DuplicateResourceException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.transcations.grn.dto.CreateGrnRequest;
import com.batchsphere.core.transcations.grn.dto.ContainerSamplingLabelRequest;
import com.batchsphere.core.transcations.grn.dto.GrnContainerResponse;
import com.batchsphere.core.transcations.grn.dto.GrnDocumentResponse;
import com.batchsphere.core.transcations.grn.dto.GrnDocumentUploadRequest;
import com.batchsphere.core.transcations.grn.dto.GrnItemRequest;
import com.batchsphere.core.transcations.grn.dto.GrnItemResponse;
import com.batchsphere.core.transcations.grn.dto.MaterialLabelResponse;
import com.batchsphere.core.transcations.grn.dto.GrnResponse;
import com.batchsphere.core.transcations.grn.dto.UpdateGrnRequest;
import com.batchsphere.core.transcations.grn.entity.GrnContainer;
import com.batchsphere.core.transcations.grn.entity.GrnDocument;
import com.batchsphere.core.transcations.grn.entity.Grn;
import com.batchsphere.core.transcations.grn.entity.GrnItem;
import com.batchsphere.core.transcations.grn.entity.GrnStatus;
import com.batchsphere.core.transcations.grn.entity.LabelStatus;
import com.batchsphere.core.transcations.grn.entity.LabelType;
import com.batchsphere.core.transcations.grn.entity.MaterialLabel;
import com.batchsphere.core.transcations.grn.repository.GrnItemRepository;
import com.batchsphere.core.transcations.grn.repository.GrnContainerRepository;
import com.batchsphere.core.transcations.grn.repository.GrnDocumentRepository;
import com.batchsphere.core.transcations.grn.repository.GrnRepository;
import com.batchsphere.core.transcations.grn.repository.MaterialLabelRepository;
import com.batchsphere.core.transcations.inventory.entity.InventoryStatus;
import com.batchsphere.core.transcations.inventory.service.InventoryService;
import com.batchsphere.core.transcations.sampling.service.SamplingService;
import com.batchsphere.core.storage.LocalStorageService;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.repository.PalletRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RackRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RoomRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.ShelfRepository;
import com.batchsphere.core.masterdata.supplier.entity.Supplier;
import com.batchsphere.core.masterdata.supplier.repository.SupplierRepository;
import com.batchsphere.core.masterdata.vendor.entity.Vendor;
import com.batchsphere.core.masterdata.vendor.repository.VendorRepository;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorBusinessUnit;
import com.batchsphere.core.masterdata.vendorbusinessunit.repository.VendorBusinessUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GrnServiceImpl implements GrnService {
    private static final DateTimeFormatter NUMERIC_BATCH_DATE = DateTimeFormatter.BASIC_ISO_DATE;


    private final GrnRepository grnRepository;
    private final GrnItemRepository grnItemRepository;
    private final GrnContainerRepository grnContainerRepository;
    private final GrnDocumentRepository grnDocumentRepository;
    private final MaterialLabelRepository materialLabelRepository;
    private final SupplierRepository supplierRepository;
    private final VendorRepository vendorRepository;
    private final VendorBusinessUnitRepository vendorBusinessUnitRepository;
    private final MaterialRepository materialRepository;
    private final PalletRepository palletRepository;
    private final ShelfRepository shelfRepository;
    private final RackRepository rackRepository;
    private final RoomRepository roomRepository;
    private final BatchRepository batchRepository;
    private final InventoryService inventoryService;
    private final SamplingService samplingService;
    private final LocalStorageService localStorageService;

    @Override
    @Transactional
    public GrnResponse createGrn(CreateGrnRequest request) {
        if (grnRepository.existsByGrnNumber(request.getGrnNumber())) {
            throw new DuplicateResourceException("GRN number already exists: " + request.getGrnNumber());
        }

        validateHeader(request.getSupplierId(), request.getVendorId(), request.getVendorBusinessUnitId());

        Grn grn = Grn.builder()
                .id(UUID.randomUUID())
                .grnNumber(request.getGrnNumber())
                .supplierId(request.getSupplierId())
                .vendorId(request.getVendorId())
                .vendorBusinessUnitId(request.getVendorBusinessUnitId())
                .receiptDate(request.getReceiptDate())
                .invoiceNumber(request.getInvoiceNumber())
                .remarks(request.getRemarks())
                .status(GrnStatus.DRAFT)
                .isActive(true)
                .createdBy(request.getCreatedBy())
                .createdAt(LocalDateTime.now())
                .build();

        Grn savedGrn = grnRepository.save(grn);
        List<GrnItem> savedItems = createItems(savedGrn.getId(), request.getItems(), request.getCreatedBy());

        return toResponse(savedGrn, savedItems);
    }

    @Override
    @Transactional(readOnly = true)
    public GrnResponse getGrnById(UUID id) {
        Grn grn = getActiveGrn(id);
        List<GrnItem> items = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(id);
        return toResponse(grn, items);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GrnResponse> getAllGrns(Pageable pageable) {
        return grnRepository.findByIsActiveTrue(pageable)
                .map(grn -> toResponse(grn, grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grn.getId())));
    }

    @Override
    @Transactional
    public GrnResponse updateGrn(UUID id, UpdateGrnRequest request) {
        Grn existing = getActiveGrn(id);
        ensureDraft(existing, "Only draft GRNs can be updated");

        if (!existing.getGrnNumber().equals(request.getGrnNumber())
                && grnRepository.existsByGrnNumber(request.getGrnNumber())) {
            throw new DuplicateResourceException("GRN number already exists: " + request.getGrnNumber());
        }

        validateHeader(request.getSupplierId(), request.getVendorId(), request.getVendorBusinessUnitId());

        existing.setGrnNumber(request.getGrnNumber());
        existing.setSupplierId(request.getSupplierId());
        existing.setVendorId(request.getVendorId());
        existing.setVendorBusinessUnitId(request.getVendorBusinessUnitId());
        existing.setReceiptDate(request.getReceiptDate());
        existing.setInvoiceNumber(request.getInvoiceNumber());
        existing.setRemarks(request.getRemarks());
        existing.setUpdatedBy(request.getUpdatedBy());
        existing.setUpdatedAt(LocalDateTime.now());

        Grn savedGrn = grnRepository.save(existing);
        deactivateExistingItems(existing.getId(), request.getUpdatedBy());
        List<GrnItem> savedItems = createItems(existing.getId(), request.getItems(), request.getUpdatedBy());

        return toResponse(savedGrn, savedItems);
    }

    @Override
    @Transactional
    public GrnResponse receiveGrn(UUID id, String updatedBy) {
        Grn grn = getActiveGrn(id);
        ensureDraft(grn, "Only draft GRNs can be received");
        List<GrnItem> items = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(id);
        items = generateInHouseBatches(grn, items, updatedBy);
        generateContainersAndLabels(grn, items, updatedBy);
        inventoryService.recordGrnReceipt(id, items, updatedBy);
        samplingService.createSamplingRequestsForGrn(id, items, updatedBy);

        grn.setStatus(GrnStatus.RECEIVED);
        grn.setUpdatedBy(updatedBy);
        grn.setUpdatedAt(LocalDateTime.now());

        Grn savedGrn = grnRepository.save(grn);
        return toResponse(savedGrn, items);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GrnContainerResponse> getContainersByGrnItemId(UUID grnItemId) {
        return grnContainerRepository.findByGrnItemIdAndIsActiveTrueOrderByContainerNumber(grnItemId)
                .stream().map(this::toContainerResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialLabelResponse> getLabelsByContainerId(UUID containerId) {
        return materialLabelRepository.findByGrnContainerIdAndIsActiveTrue(containerId)
                .stream().map(this::toLabelResponse).toList();
    }

    @Override
    @Transactional
    public GrnContainerResponse applySamplingLabel(UUID containerId, ContainerSamplingLabelRequest request) {
        GrnContainer container = grnContainerRepository.findById(containerId)
                .orElseThrow(() -> new ResourceNotFoundException("GRN container not found with id: " + containerId));

        if (!Boolean.TRUE.equals(container.getIsActive())) {
            throw new ResourceNotFoundException("GRN container not found with id: " + containerId);
        }
        if (request.getSampledQuantity().compareTo(container.getQuantity()) > 0) {
            throw new BusinessConflictException("Sampled quantity cannot exceed container quantity");
        }

        container.setSampled(true);
        container.setSampledQuantity(request.getSampledQuantity());
        container.setSamplingLocation(request.getSamplingLocation());
        container.setSampledBy(request.getSampledBy());
        container.setSampledAt(LocalDateTime.now());
        container.setLabelStatus(LabelStatus.APPLIED);
        container.setInventoryStatus(InventoryStatus.SAMPLING);
        container.setUpdatedBy(request.getSampledBy());
        container.setUpdatedAt(LocalDateTime.now());
        GrnContainer savedContainer = grnContainerRepository.save(container);

        String labelContent = buildSamplingLabel(savedContainer);
        String qrPayload = buildSamplingLabelQrPayload(savedContainer);
        MaterialLabel label = MaterialLabel.builder()
                .id(UUID.randomUUID())
                .grnContainerId(savedContainer.getId())
                .labelType(LabelType.QC_SAMPLING)
                .labelStatus(LabelStatus.APPLIED)
                .labelContent(labelContent)
                .qrPayload(qrPayload)
                .qrCodeDataUrl(generateQrCodeDataUrl(qrPayload))
                .generatedBy(request.getSampledBy())
                .generatedAt(LocalDateTime.now())
                .appliedBy(request.getSampledBy())
                .appliedAt(LocalDateTime.now())
                .isActive(true)
                .build();
        materialLabelRepository.save(label);

        return toContainerResponse(savedContainer);
    }

    @Override
    @Transactional
    public GrnDocumentResponse uploadDocument(UUID grnItemId, GrnDocumentUploadRequest request, MultipartFile file) {
        GrnItem grnItem = grnItemRepository.findById(grnItemId)
                .orElseThrow(() -> new ResourceNotFoundException("GRN item not found with id: " + grnItemId));
        if (!Boolean.TRUE.equals(grnItem.getIsActive())) {
            throw new ResourceNotFoundException("GRN item not found with id: " + grnItemId);
        }
        String documentPath = localStorageService.store("grn", "line-items/" + grnItem.getId() + "/documents", file);

        GrnDocument document = GrnDocument.builder()
                .id(UUID.randomUUID())
                .grnId(grnItem.getGrnId())
                .grnItemId(grnItemId)
                .documentName(request.getDocumentName().trim())
                .documentType(request.getDocumentType().trim())
                .fileName(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename())
                .documentPath(documentPath)
                .documentUrl(request.getDocumentUrl())
                .isActive(true)
                .createdBy(request.getCreatedBy().trim())
                .createdAt(LocalDateTime.now())
                .build();

        return toDocumentResponse(grnDocumentRepository.save(document));
    }

    @Override
    @Transactional
    public GrnResponse cancelGrn(UUID id, String updatedBy) {
        Grn grn = getActiveGrn(id);
        if (grn.getStatus() == GrnStatus.RECEIVED) {
            throw new BusinessConflictException("Received GRN cannot be cancelled");
        }

        grn.setStatus(GrnStatus.CANCELLED);
        grn.setUpdatedBy(updatedBy);
        grn.setUpdatedAt(LocalDateTime.now());

        Grn savedGrn = grnRepository.save(grn);
        List<GrnItem> items = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(id);
        return toResponse(savedGrn, items);
    }

    @Override
    @Transactional
    public void deactivateGrn(UUID id, String updatedBy) {
        Grn grn = getActiveGrn(id);
        if (grn.getStatus() == GrnStatus.RECEIVED) {
            throw new BusinessConflictException("Received GRN cannot be deactivated");
        }

        grn.setIsActive(false);
        grn.setUpdatedBy(updatedBy);
        grn.setUpdatedAt(LocalDateTime.now());
        grnRepository.save(grn);

        List<GrnItem> items = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(id);
        LocalDateTime now = LocalDateTime.now();
        for (GrnItem item : items) {
            item.setIsActive(false);
            item.setUpdatedBy(updatedBy);
            item.setUpdatedAt(now);
        }
        grnItemRepository.saveAll(items);
    }

    private List<GrnItem> createItems(UUID grnId, List<GrnItemRequest> requests, String actor) {
        LocalDateTime now = LocalDateTime.now();
        List<GrnItem> items = new ArrayList<>();

        for (int index = 0; index < requests.size(); index++) {
            GrnItemRequest request = requests.get(index);
            Material material = getActiveMaterial(request.getMaterialId());
            Pallet pallet = getActivePallet(request.getPalletId());
            validateItem(request, material);
            BigDecimal totalPrice = request.getUnitPrice().multiply(request.getReceivedQuantity());
            BigDecimal expectedTotal = request.getQuantityPerContainer().multiply(BigDecimal.valueOf(request.getNumberOfContainers()));
            if (expectedTotal.compareTo(request.getReceivedQuantity()) != 0) {
                throw new BusinessConflictException("Quantity per container multiplied by number of containers must equal received quantity");
            }

            GrnItem item = GrnItem.builder()
                    .id(UUID.randomUUID())
                    .grnId(grnId)
                    .lineNumber(index + 1)
                    .materialId(request.getMaterialId())
                    .batchId(request.getBatchId())
                    .receivedQuantity(request.getReceivedQuantity())
                    .acceptedQuantity(request.getAcceptedQuantity())
                    .rejectedQuantity(request.getRejectedQuantity())
                    .uom(request.getUom())
                    .warehouseLocation(pallet.getPalletCode())
                    .palletId(request.getPalletId())
                    .containerType(request.getContainerType())
                    .numberOfContainers(request.getNumberOfContainers())
                    .quantityPerContainer(request.getQuantityPerContainer())
                    .vendorBatch(request.getVendorBatch())
                    .manufactureDate(request.getManufactureDate())
                    .expiryDate(request.getExpiryDate())
                    .retestDate(request.getRetestDate())
                    .unitPrice(request.getUnitPrice())
                    .totalPrice(totalPrice)
                    .qcStatus(request.getQcStatus())
                    .description(request.getDescription())
                    .isActive(true)
                    .createdBy(actor)
                    .createdAt(now)
                    .build();
            items.add(item);
        }

        return grnItemRepository.saveAll(items);
    }

    private void deactivateExistingItems(UUID grnId, String updatedBy) {
        List<GrnItem> items = grnItemRepository.findByGrnIdAndIsActiveTrueOrderByLineNumber(grnId);
        LocalDateTime now = LocalDateTime.now();
        for (GrnItem item : items) {
            item.setIsActive(false);
            item.setUpdatedBy(updatedBy);
            item.setUpdatedAt(now);
        }
        grnItemRepository.saveAll(items);
    }

    private void validateHeader(UUID supplierId, UUID vendorId, UUID vendorBusinessUnitId) {
        getActiveSupplier(supplierId);
        getActiveVendor(vendorId);
        VendorBusinessUnit vendorBusinessUnit = getActiveVendorBusinessUnit(vendorBusinessUnitId);

        if (!vendorBusinessUnit.getVendorId().equals(vendorId)) {
            throw new BusinessConflictException("Vendor business unit does not belong to the provided vendor");
        }
    }

    private void validateItem(GrnItemRequest request, Material material) {
        if (request.getBatchId() != null) {
            throw new BusinessConflictException(
                    "Manual batch entry is disabled. Batch numbers are generated automatically from GRN receipt"
            );
        }

        BigDecimal totalProcessed = request.getAcceptedQuantity().add(request.getRejectedQuantity());
        if (totalProcessed.compareTo(request.getReceivedQuantity()) > 0) {
            throw new BusinessConflictException("Accepted and rejected quantities cannot exceed received quantity");
        }

        if (!material.getUom().equalsIgnoreCase(request.getUom())) {
            throw new BusinessConflictException("GRN item UOM must match the material UOM");
        }
        Room room = getRoomForPallet(request.getPalletId());
        if (material.getStorageCondition() != room.getStorageCondition()) {
            throw new BusinessConflictException("Selected pallet must belong to a room matching the material storage condition");
        }
        if (request.getQcStatus() == null) {
            throw new BusinessConflictException("QC status is required");
        }

    }

    private List<GrnItem> generateInHouseBatches(Grn grn, List<GrnItem> items, String actor) {
        boolean updated = false;
        LocalDateTime now = LocalDateTime.now();

        for (GrnItem item : items) {
            if (item.getBatchId() != null) {
                continue;
            }

            Material material = getActiveMaterial(item.getMaterialId());
            Batch batch = Batch.builder()
                    .id(UUID.randomUUID())
                    .batchNumber(generateUniqueInHouseBatchNumber(grn, item))
                    .material(material)
                    .batchType(BatchType.RAW_MATERIAL)
                    .batchStatus(BatchStatus.CREATED)
                    .quantity(item.getReceivedQuantity())
                    .unitOfMeasure(item.getUom())
                    .manufactureDate(item.getManufactureDate())
                    .expiryDate(item.getExpiryDate())
                    .retestDate(item.getRetestDate())
                    .isActive(true)
                    .createdBy(actor)
                    .createdAt(now)
                    .build();

            Batch savedBatch = batchRepository.save(batch);
            item.setBatchId(savedBatch.getId());
            item.setUpdatedBy(actor);
            item.setUpdatedAt(now);
            updated = true;
        }

        return updated ? grnItemRepository.saveAll(items) : items;
    }

    private String generateUniqueInHouseBatchNumber(Grn grn, GrnItem item) {
        String grnPart = grn.getGrnNumber().replaceAll("\\D", "");
        if (grnPart.isBlank()) {
            grnPart = String.valueOf(Math.abs(grn.getId().hashCode()));
        }

        String baseNumber = grn.getReceiptDate().format(NUMERIC_BATCH_DATE)
                + grnPart
                + String.format("%02d", item.getLineNumber());
        String candidate = baseNumber;
        int suffix = 1;

        while (batchRepository.existsByBatchNumber(candidate)) {
            candidate = baseNumber + String.format("%02d", suffix);
            suffix++;
        }

        return candidate;
    }

    private Grn getActiveGrn(UUID id) {
        Grn grn = grnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GRN not found with id: " + id));
        if (!Boolean.TRUE.equals(grn.getIsActive())) {
            throw new ResourceNotFoundException("GRN not found with id: " + id);
        }
        return grn;
    }

    private Supplier getActiveSupplier(UUID id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
        if (!Boolean.TRUE.equals(supplier.getIsActive())) {
            throw new BusinessConflictException("Supplier is inactive: " + id);
        }
        return supplier;
    }

    private Vendor getActiveVendor(UUID id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));
        if (!Boolean.TRUE.equals(vendor.getIsActive())) {
            throw new BusinessConflictException("Vendor is inactive: " + id);
        }
        return vendor;
    }

    private VendorBusinessUnit getActiveVendorBusinessUnit(UUID id) {
        VendorBusinessUnit vendorBusinessUnit = vendorBusinessUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor business unit not found with id: " + id));
        if (!Boolean.TRUE.equals(vendorBusinessUnit.getIsActive())) {
            throw new BusinessConflictException("Vendor business unit is inactive: " + id);
        }
        return vendorBusinessUnit;
    }

    private Material getActiveMaterial(UUID id) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + id));
        if (!Boolean.TRUE.equals(material.getIsActive())) {
            throw new BusinessConflictException("Material is inactive: " + id);
        }
        return material;
    }

    private Batch getActiveBatch(UUID id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + id));
        if (!Boolean.TRUE.equals(batch.getIsActive())) {
            throw new BusinessConflictException("Batch is inactive: " + id);
        }
        return batch;
    }

    private Pallet getActivePallet(UUID id) {
        Pallet pallet = palletRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pallet not found with id: " + id));
        if (!Boolean.TRUE.equals(pallet.getIsActive())) {
            throw new BusinessConflictException("Pallet is inactive: " + id);
        }
        return pallet;
    }

    private Room getRoomForPallet(UUID palletId) {
        Pallet pallet = getActivePallet(palletId);
        Shelf shelf = shelfRepository.findById(pallet.getShelfId())
                .orElseThrow(() -> new ResourceNotFoundException("Shelf not found with id: " + pallet.getShelfId()));
        Rack rack = rackRepository.findById(shelf.getRackId())
                .orElseThrow(() -> new ResourceNotFoundException("Rack not found with id: " + shelf.getRackId()));
        Room room = roomRepository.findById(rack.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + rack.getRoomId()));
        if (!Boolean.TRUE.equals(room.getIsActive())) {
            throw new BusinessConflictException("Room is inactive: " + room.getId());
        }
        return room;
    }

    private void ensureDraft(Grn grn, String message) {
        if (grn.getStatus() != GrnStatus.DRAFT) {
            throw new BusinessConflictException(message);
        }
    }

    private GrnResponse toResponse(Grn grn, List<GrnItem> items) {
        return GrnResponse.builder()
                .id(grn.getId())
                .grnNumber(grn.getGrnNumber())
                .supplierId(grn.getSupplierId())
                .vendorId(grn.getVendorId())
                .vendorBusinessUnitId(grn.getVendorBusinessUnitId())
                .receiptDate(grn.getReceiptDate())
                .invoiceNumber(grn.getInvoiceNumber())
                .remarks(grn.getRemarks())
                .status(grn.getStatus())
                .isActive(grn.getIsActive())
                .createdBy(grn.getCreatedBy())
                .createdAt(grn.getCreatedAt())
                .updatedBy(grn.getUpdatedBy())
                .updatedAt(grn.getUpdatedAt())
                .items(items.stream().map(this::toItemResponse).toList())
                .build();
    }

    private GrnItemResponse toItemResponse(GrnItem item) {
        return GrnItemResponse.builder()
                .id(item.getId())
                .lineNumber(item.getLineNumber())
                .materialId(item.getMaterialId())
                .batchId(item.getBatchId())
                .receivedQuantity(item.getReceivedQuantity())
                .acceptedQuantity(item.getAcceptedQuantity())
                .rejectedQuantity(item.getRejectedQuantity())
                .uom(item.getUom())
                .palletId(item.getPalletId())
                .containerType(item.getContainerType())
                .numberOfContainers(item.getNumberOfContainers())
                .quantityPerContainer(item.getQuantityPerContainer())
                .vendorBatch(item.getVendorBatch())
                .manufactureDate(item.getManufactureDate())
                .expiryDate(item.getExpiryDate())
                .retestDate(item.getRetestDate())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .qcStatus(item.getQcStatus())
                .description(item.getDescription())
                .isActive(item.getIsActive())
                .createdBy(item.getCreatedBy())
                .createdAt(item.getCreatedAt())
                .updatedBy(item.getUpdatedBy())
                .updatedAt(item.getUpdatedAt())
                .documents(grnDocumentRepository.findByGrnItemIdAndIsActiveTrueOrderByCreatedAtDesc(item.getId())
                        .stream()
                        .map(this::toDocumentResponse)
                        .toList())
                .build();
    }

    private void generateContainersAndLabels(Grn grn, List<GrnItem> items, String actor) {
        for (GrnItem item : items) {
            if (!grnContainerRepository.findByGrnItemIdAndIsActiveTrueOrderByContainerNumber(item.getId()).isEmpty()) {
                continue;
            }

            Material material = getActiveMaterial(item.getMaterialId());
            Batch batch = getActiveBatch(item.getBatchId());
            Room room = getRoomForPallet(item.getPalletId());
            String internalLot = generateInternalLot(grn, item);
            for (int index = 1; index <= item.getNumberOfContainers(); index++) {
                String containerNumber = item.getContainerType().name() + "-" + String.format("%02d", index);
                GrnContainer container = GrnContainer.builder()
                        .id(UUID.randomUUID())
                        .grnId(grn.getId())
                        .grnItemId(item.getId())
                        .materialId(item.getMaterialId())
                        .batchId(item.getBatchId())
                        .palletId(item.getPalletId())
                        .containerNumber(containerNumber)
                        .containerType(item.getContainerType())
                        .vendorBatch(item.getVendorBatch())
                        .internalLot(internalLot)
                        .quantity(item.getQuantityPerContainer())
                        .uom(item.getUom())
                        .manufactureDate(item.getManufactureDate())
                        .expiryDate(item.getExpiryDate())
                        .retestDate(item.getRetestDate())
                        .storageCondition(room.getStorageCondition())
                        .inventoryStatus(InventoryStatus.QUARANTINE)
                        .labelStatus(LabelStatus.GENERATED)
                        .sampled(false)
                        .isActive(true)
                        .createdBy(actor)
                        .createdAt(LocalDateTime.now())
                        .build();
                GrnContainer savedContainer = grnContainerRepository.save(container);

                MaterialLabel inHouseLabel = MaterialLabel.builder()
                        .id(UUID.randomUUID())
                        .grnContainerId(savedContainer.getId())
                        .labelType(LabelType.IN_HOUSE_RECEIPT)
                        .labelStatus(LabelStatus.GENERATED)
                        .labelContent(buildInHouseReceiptLabel(material, savedContainer, batch))
                        .qrPayload(buildInHouseReceiptQrPayload(material, savedContainer, batch))
                        .qrCodeDataUrl(generateQrCodeDataUrl(buildInHouseReceiptQrPayload(material, savedContainer, batch)))
                        .generatedBy(actor)
                        .generatedAt(LocalDateTime.now())
                        .isActive(true)
                        .build();
                materialLabelRepository.save(inHouseLabel);
            }
        }
    }

    private String generateInternalLot(Grn grn, GrnItem item) {
        return "LOT-" + grn.getReceiptDate().getYear() + "-" + String.format("%03d", item.getLineNumber());
    }

    private String buildInHouseReceiptLabel(Material material, GrnContainer container, Batch batch) {
        return "In-house Batch No : " + batch.getBatchNumber() + "\n"
                + "Material Name : " + material.getMaterialName() + "\n"
                + "Container Number : " + container.getContainerNumber() + "\n"
                + "Quantity : " + container.getQuantity() + " " + container.getUom() + "\n"
                + "Manufacturing Date : " + container.getManufactureDate() + "\n"
                + "Storage Condition : " + container.getStorageCondition();
    }

    private String buildInHouseReceiptQrPayload(Material material, GrnContainer container, Batch batch) {
        return "inHouseBatchNo=" + batch.getBatchNumber() + "\n"
                + "materialName=" + material.getMaterialName() + "\n"
                + "containerNumber=" + container.getContainerNumber() + "\n"
                + "quantity=" + container.getQuantity() + " " + container.getUom() + "\n"
                + "manufacturingDate=" + container.getManufactureDate() + "\n"
                + "storageCondition=" + container.getStorageCondition() + "\n"
                + "materialStatus=" + container.getInventoryStatus() + "\n"
                + "expiryDate=" + batch.getExpiryDate() + "\n"
                + "retestDate=" + batch.getRetestDate();
    }

    private String buildSamplingLabel(GrnContainer container) {
        Grn grn = grnRepository.findById(container.getGrnId())
                .orElseThrow(() -> new ResourceNotFoundException("GRN not found with id: " + container.getGrnId()));
        Material material = getActiveMaterial(container.getMaterialId());
        return "SAMPLED\n\n"
                + "Material : " + material.getMaterialName() + "\n"
                + "Container : " + container.getContainerNumber() + "\n"
                + "GRN : " + grn.getGrnNumber() + "\n\n"
                + "Sampled By : " + container.getSampledBy() + "\n"
                + "Sampled Date : " + container.getSampledAt() + "\n"
                + "Sample Qty : " + container.getSampledQuantity() + " " + container.getUom() + "\n\n"
                + "Sampling Location : " + container.getSamplingLocation();
    }

    private String buildSamplingLabelQrPayload(GrnContainer container) {
        Grn grn = grnRepository.findById(container.getGrnId())
                .orElseThrow(() -> new ResourceNotFoundException("GRN not found with id: " + container.getGrnId()));
        Material material = getActiveMaterial(container.getMaterialId());
        Batch batch = getActiveBatch(container.getBatchId());
        return "inHouseBatchNo=" + batch.getBatchNumber() + "\n"
                + "materialName=" + material.getMaterialName() + "\n"
                + "containerNumber=" + container.getContainerNumber() + "\n"
                + "quantity=" + container.getQuantity() + " " + container.getUom() + "\n"
                + "manufacturingDate=" + container.getManufactureDate() + "\n"
                + "storageCondition=" + container.getStorageCondition() + "\n"
                + "materialStatus=" + container.getInventoryStatus() + "\n"
                + "expiryDate=" + batch.getExpiryDate() + "\n"
                + "retestDate=" + batch.getRetestDate() + "\n"
                + "grnNumber=" + grn.getGrnNumber();
    }

    private String generateQrCodeDataUrl(String payload) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(payload, BarcodeFormat.QR_CODE, 220, 220);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", outputStream);
            String base64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            return "data:image/png;base64," + base64;
        } catch (WriterException | java.io.IOException exception) {
            throw new BusinessConflictException("Unable to generate QR code for label");
        }
    }

    private GrnContainerResponse toContainerResponse(GrnContainer container) {
        return GrnContainerResponse.builder()
                .id(container.getId())
                .grnId(container.getGrnId())
                .grnItemId(container.getGrnItemId())
                .materialId(container.getMaterialId())
                .batchId(container.getBatchId())
                .palletId(container.getPalletId())
                .containerNumber(container.getContainerNumber())
                .containerType(container.getContainerType())
                .vendorBatch(container.getVendorBatch())
                .internalLot(container.getInternalLot())
                .quantity(container.getQuantity())
                .uom(container.getUom())
                .manufactureDate(container.getManufactureDate())
                .expiryDate(container.getExpiryDate())
                .retestDate(container.getRetestDate())
                .storageCondition(container.getStorageCondition())
                .inventoryStatus(container.getInventoryStatus())
                .labelStatus(container.getLabelStatus())
                .sampled(container.getSampled())
                .sampledQuantity(container.getSampledQuantity())
                .samplingLocation(container.getSamplingLocation())
                .sampledBy(container.getSampledBy())
                .sampledAt(container.getSampledAt())
                .build();
    }

    private MaterialLabelResponse toLabelResponse(MaterialLabel label) {
        return MaterialLabelResponse.builder()
                .id(label.getId())
                .grnContainerId(label.getGrnContainerId())
                .labelType(label.getLabelType())
                .labelStatus(label.getLabelStatus())
                .labelContent(label.getLabelContent())
                .qrPayload(label.getQrPayload())
                .qrCodeDataUrl(label.getQrCodeDataUrl())
                .generatedBy(label.getGeneratedBy())
                .generatedAt(label.getGeneratedAt())
                .appliedBy(label.getAppliedBy())
                .appliedAt(label.getAppliedAt())
                .build();
    }

    private GrnDocumentResponse toDocumentResponse(GrnDocument document) {
        return GrnDocumentResponse.builder()
                .id(document.getId())
                .grnItemId(document.getGrnItemId())
                .documentName(document.getDocumentName())
                .documentType(document.getDocumentType())
                .fileName(document.getFileName())
                .documentPath(document.getDocumentPath())
                .documentUrl(document.getDocumentUrl())
                .createdBy(document.getCreatedBy())
                .createdAt(document.getCreatedAt())
                .build();
    }
}
