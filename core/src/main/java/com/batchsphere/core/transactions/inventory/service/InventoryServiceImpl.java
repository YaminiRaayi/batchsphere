package com.batchsphere.core.transactions.inventory.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.warehouselocation.repository.PalletRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RackRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RoomRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.ShelfRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseRepository;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.inventory.dto.InventoryAdjustmentRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventorySummaryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventoryStatusUpdateRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransferRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransactionResponse;
import com.batchsphere.core.transactions.inventory.entity.Inventory;
import com.batchsphere.core.transactions.inventory.entity.InventoryReferenceType;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransaction;
import com.batchsphere.core.transactions.inventory.entity.InventoryTransactionType;
import com.batchsphere.core.transactions.inventory.repository.InventoryRepository;
import com.batchsphere.core.transactions.inventory.repository.InventoryTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final PalletRepository palletRepository;
    private final ShelfRepository shelfRepository;
    private final RackRepository rackRepository;
    private final RoomRepository roomRepository;
    private final WarehouseRepository warehouseRepository;

    private static final Map<InventoryStatus, EnumSet<InventoryStatus>> ALLOWED_TRANSITIONS = Map.of(
            InventoryStatus.QUARANTINE, EnumSet.of(InventoryStatus.SAMPLING),
            InventoryStatus.SAMPLING, EnumSet.of(InventoryStatus.UNDER_TEST),
            InventoryStatus.UNDER_TEST, EnumSet.of(InventoryStatus.RELEASED, InventoryStatus.REJECTED, InventoryStatus.BLOCKED),
            InventoryStatus.RELEASED, EnumSet.noneOf(InventoryStatus.class),
            InventoryStatus.REJECTED, EnumSet.noneOf(InventoryStatus.class),
            InventoryStatus.BLOCKED, EnumSet.noneOf(InventoryStatus.class)
    );

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryResponse> getAllInventory(Pageable pageable) {
        return inventoryRepository.findByIsActiveTrue(pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryResponse getInventoryById(UUID id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with id: " + id));
        return toResponse(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryTransactionResponse> getAllInventoryTransactions(Pageable pageable) {
        return inventoryTransactionRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toTransactionResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public InventorySummaryResponse getInventorySummary() {
        Map<InventoryStatus, Long> counts = new LinkedHashMap<>();
        for (InventoryStatus status : InventoryStatus.values()) {
            counts.put(status, 0L);
        }

        for (Object[] row : inventoryRepository.countActiveByStatus()) {
            InventoryStatus status = (InventoryStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status, count);
        }

        return InventorySummaryResponse.builder()
                .countsByStatus(counts)
                .build();
    }

    @Override
    @Transactional
    public InventoryResponse updateInventoryStatus(UUID id, InventoryStatusUpdateRequest request) {
        String actor = authenticatedActorService.currentActor();
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with id: " + id));

        if (!Boolean.TRUE.equals(inventory.getIsActive())) {
            throw new ResourceNotFoundException("Inventory not found with id: " + id);
        }

        InventoryStatus targetStatus = request.getStatus();
        validateStatusTransition(inventory.getStatus(), targetStatus);

        if (inventory.getStatus() == targetStatus) {
            return toResponse(inventory);
        }

        InventoryStatus previousStatus = inventory.getStatus();
        LocalDateTime now = LocalDateTime.now();
        inventory.setStatus(targetStatus);
        inventory.setUpdatedBy(actor);
        inventory.setUpdatedAt(now);
        Inventory savedInventory = inventoryRepository.save(inventory);

        inventoryTransactionRepository.save(InventoryTransaction.builder()
                .id(UUID.randomUUID())
                .inventoryId(savedInventory.getId())
                .materialId(savedInventory.getMaterialId())
                .batchId(savedInventory.getBatchId())
                .warehouseLocation(savedInventory.getWarehouseLocation())
                .palletId(savedInventory.getPalletId())
                .transactionType(InventoryTransactionType.STATUS_CHANGE)
                .referenceType(InventoryReferenceType.INVENTORY)
                .referenceId(savedInventory.getId())
                .quantity(savedInventory.getQuantityOnHand())
                .uom(savedInventory.getUom())
                .remarks(buildStatusChangeRemarks(previousStatus, targetStatus, request.getRemarks()))
                .createdBy(actor)
                .createdAt(now)
                .build());

        return toResponse(savedInventory);
    }

    @Override
    @Transactional
    public InventoryResponse adjustInventory(UUID id, InventoryAdjustmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        Inventory inventory = getActiveInventory(id);
        BigDecimal signedDelta = Boolean.TRUE.equals(request.getIncrease())
                ? request.getQuantityDelta()
                : request.getQuantityDelta().negate();
        BigDecimal updatedQuantity = inventory.getQuantityOnHand().add(signedDelta);

        if (updatedQuantity.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessConflictException("Inventory adjustment cannot reduce quantity below zero");
        }

        LocalDateTime now = LocalDateTime.now();
        inventory.setQuantityOnHand(updatedQuantity);
        inventory.setUpdatedBy(actor);
        inventory.setUpdatedAt(now);
        Inventory savedInventory = inventoryRepository.save(inventory);

        inventoryTransactionRepository.save(buildTransaction(
                savedInventory,
                InventoryTransactionType.ADJUSTMENT,
                InventoryReferenceType.INVENTORY,
                savedInventory.getId(),
                signedDelta,
                "Inventory adjusted - " + request.getReason().trim(),
                actor,
                now
        ));

        return toResponse(savedInventory);
    }

    @Override
    @Transactional
    public InventoryResponse transferInventory(UUID id, InventoryTransferRequest request) {
        String actor = authenticatedActorService.currentActor();
        Inventory sourceInventory = getActiveInventory(id);
        if (sourceInventory.getPalletId().equals(request.getDestinationPalletId())) {
            throw new BusinessConflictException("Transfer destination pallet must be different from source pallet");
        }
        if (request.getQuantity().compareTo(sourceInventory.getQuantityOnHand()) > 0) {
            throw new BusinessConflictException("Transfer quantity cannot exceed available inventory");
        }

        Pallet sourcePallet = getActivePallet(sourceInventory.getPalletId());
        Pallet destinationPallet = getActivePallet(request.getDestinationPalletId());
        validateTransferStorageCondition(sourcePallet, destinationPallet);

        LocalDateTime now = LocalDateTime.now();
        sourceInventory.setQuantityOnHand(sourceInventory.getQuantityOnHand().subtract(request.getQuantity()));
        sourceInventory.setUpdatedBy(actor);
        sourceInventory.setUpdatedAt(now);
        inventoryRepository.save(sourceInventory);

        Inventory destinationInventory = inventoryRepository
                .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                        sourceInventory.getMaterialId(),
                        sourceInventory.getBatchId(),
                        destinationPallet.getId()
                )
                .orElseGet(() -> Inventory.builder()
                        .id(UUID.randomUUID())
                        .materialId(sourceInventory.getMaterialId())
                        .batchId(sourceInventory.getBatchId())
                        .warehouseLocation(buildWarehouseLocation(destinationPallet))
                        .palletId(destinationPallet.getId())
                        .quantityOnHand(BigDecimal.ZERO)
                        .uom(sourceInventory.getUom())
                        .status(sourceInventory.getStatus())
                        .isActive(true)
                        .createdBy(actor)
                        .createdAt(now)
                        .build());

        destinationInventory.setWarehouseLocation(buildWarehouseLocation(destinationPallet));
        destinationInventory.setQuantityOnHand(destinationInventory.getQuantityOnHand().add(request.getQuantity()));
        destinationInventory.setUom(sourceInventory.getUom());
        destinationInventory.setStatus(sourceInventory.getStatus());
        destinationInventory.setUpdatedBy(actor);
        destinationInventory.setUpdatedAt(now);
        Inventory savedDestinationInventory = inventoryRepository.save(destinationInventory);

        String remarks = buildTransferRemarks(sourcePallet, destinationPallet, request.getRemarks());
        inventoryTransactionRepository.save(buildTransaction(
                sourceInventory,
                InventoryTransactionType.TRANSFER,
                InventoryReferenceType.INVENTORY,
                savedDestinationInventory.getId(),
                request.getQuantity().negate(),
                remarks,
                actor,
                now
        ));
        inventoryTransactionRepository.save(buildTransaction(
                savedDestinationInventory,
                InventoryTransactionType.TRANSFER,
                InventoryReferenceType.INVENTORY,
                sourceInventory.getId(),
                request.getQuantity(),
                remarks,
                actor,
                now
        ));

        return toResponse(savedDestinationInventory);
    }

    @Override
    @Transactional
    public void recordGrnReceipt(UUID grnId, List<GrnItem> items, String actor) {
        LocalDateTime now = LocalDateTime.now();

        for (GrnItem item : items) {
            validateReceivableItem(item);
            if (item.getAcceptedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            Inventory inventory = inventoryRepository
                    .findByMaterialIdAndBatchIdAndPalletIdAndIsActiveTrue(
                            item.getMaterialId(),
                            item.getBatchId(),
                            item.getPalletId()
                    )
                    .orElseGet(() -> Inventory.builder()
                            .id(UUID.randomUUID())
                            .materialId(item.getMaterialId())
                            .batchId(item.getBatchId())
                            .warehouseLocation(item.getWarehouseLocation())
                            .palletId(item.getPalletId())
                            .quantityOnHand(BigDecimal.ZERO)
                            .uom(item.getUom())
                            .status(InventoryStatus.QUARANTINE)
                            .isActive(true)
                            .createdBy(actor)
                            .createdAt(now)
                            .build());

            inventory.setQuantityOnHand(inventory.getQuantityOnHand().add(item.getAcceptedQuantity()));
            inventory.setWarehouseLocation(item.getWarehouseLocation());
            inventory.setUom(item.getUom());
            inventory.setStatus(InventoryStatus.QUARANTINE);
            inventory.setUpdatedBy(actor);
            inventory.setUpdatedAt(now);

            Inventory savedInventory = inventoryRepository.save(inventory);

            InventoryTransaction transaction = InventoryTransaction.builder()
                    .id(UUID.randomUUID())
                    .inventoryId(savedInventory.getId())
                    .materialId(item.getMaterialId())
                    .batchId(item.getBatchId())
                    .warehouseLocation(item.getWarehouseLocation())
                    .palletId(item.getPalletId())
                    .transactionType(InventoryTransactionType.INBOUND)
                    .referenceType(InventoryReferenceType.GRN)
                    .referenceId(grnId)
                    .quantity(item.getAcceptedQuantity())
                    .uom(item.getUom())
                    .remarks("Inventory added from GRN receipt")
                    .createdBy(actor)
                    .createdAt(now)
                    .build();

            inventoryTransactionRepository.save(transaction);
        }
    }

    @Override
    @Transactional
    public void updateInventoryStatusForGrnItem(UUID grnItemId, InventoryStatus status, String actor) {
        throw new UnsupportedOperationException("Status update by GRN item requires item lookup and is handled through the overload with stock keys");
    }

    @Transactional
    public void updateInventoryStatus(UUID materialId, UUID batchId, UUID palletId, InventoryStatus status, String actor) {
        Inventory inventory = inventoryRepository.findByMaterialIdAndBatchIdAndPalletId(
                        materialId,
                        batchId,
                        palletId
                )
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for material, batch and pallet"));

        inventory.setStatus(status);
        inventory.setUpdatedBy(actor);
        inventory.setUpdatedAt(LocalDateTime.now());
        inventoryRepository.save(inventory);
    }

    private void validateStatusTransition(InventoryStatus currentStatus, InventoryStatus targetStatus) {
        if (currentStatus == targetStatus) {
            return;
        }

        EnumSet<InventoryStatus> allowedTargets = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, EnumSet.noneOf(InventoryStatus.class));
        if (!allowedTargets.contains(targetStatus)) {
            throw new BusinessConflictException(
                    "Invalid inventory status transition from " + currentStatus + " to " + targetStatus
            );
        }
    }

    private String buildStatusChangeRemarks(InventoryStatus previousStatus, InventoryStatus targetStatus, String requestRemarks) {
        String base = "Inventory status changed from " + previousStatus + " to " + targetStatus;
        if (requestRemarks == null || requestRemarks.isBlank()) {
            return base;
        }
        return base + " - " + requestRemarks.trim();
    }

    private String buildTransferRemarks(Pallet sourcePallet, Pallet destinationPallet, String requestRemarks) {
        String base = "Inventory transferred from " + sourcePallet.getPalletCode() + " to " + destinationPallet.getPalletCode();
        if (requestRemarks == null || requestRemarks.isBlank()) {
            return base;
        }
        return base + " - " + requestRemarks.trim();
    }

    private void validateTransferStorageCondition(Pallet sourcePallet, Pallet destinationPallet) {
        StorageCondition sourceCondition = sourcePallet.getStorageCondition();
        StorageCondition destinationCondition = destinationPallet.getStorageCondition();
        if (sourceCondition != destinationCondition) {
            throw new BusinessConflictException("Destination pallet storage condition must match the source pallet");
        }
    }

    private Inventory getActiveInventory(UUID id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with id: " + id));
        if (!Boolean.TRUE.equals(inventory.getIsActive())) {
            throw new ResourceNotFoundException("Inventory not found with id: " + id);
        }
        return inventory;
    }

    private Pallet getActivePallet(UUID palletId) {
        Pallet pallet = palletRepository.findById(palletId)
                .orElseThrow(() -> new ResourceNotFoundException("Pallet not found with id: " + palletId));
        if (!Boolean.TRUE.equals(pallet.getIsActive())) {
            throw new BusinessConflictException("Pallet is inactive: " + palletId);
        }
        return pallet;
    }

    private String buildWarehouseLocation(Pallet pallet) {
        Shelf shelf = shelfRepository.findById(pallet.getShelfId())
                .orElseThrow(() -> new ResourceNotFoundException("Shelf not found with id: " + pallet.getShelfId()));
        Rack rack = rackRepository.findById(shelf.getRackId())
                .orElseThrow(() -> new ResourceNotFoundException("Rack not found with id: " + shelf.getRackId()));
        Room room = roomRepository.findById(rack.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + rack.getRoomId()));
        Warehouse warehouse = warehouseRepository.findById(room.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + room.getWarehouseId()));
        return warehouse.getWarehouseCode()
                + "/" + room.getRoomCode()
                + "/" + rack.getRackCode()
                + "/" + shelf.getShelfCode()
                + "/" + pallet.getPalletCode();
    }

    private InventoryTransaction buildTransaction(Inventory inventory,
                                                 InventoryTransactionType type,
                                                 InventoryReferenceType referenceType,
                                                 UUID referenceId,
                                                 BigDecimal quantity,
                                                 String remarks,
                                                 String actor,
                                                 LocalDateTime now) {
        return InventoryTransaction.builder()
                .id(UUID.randomUUID())
                .inventoryId(inventory.getId())
                .materialId(inventory.getMaterialId())
                .batchId(inventory.getBatchId())
                .warehouseLocation(inventory.getWarehouseLocation())
                .palletId(inventory.getPalletId())
                .transactionType(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .quantity(quantity)
                .uom(inventory.getUom())
                .remarks(remarks)
                .createdBy(actor)
                .createdAt(now)
                .build();
    }

    private void validateReceivableItem(GrnItem item) {
        if (item.getAcceptedQuantity().compareTo(BigDecimal.ZERO) > 0 && item.getBatchId() == null) {
            throw new BusinessConflictException("Accepted GRN quantity requires a batch for inventory tracking");
        }

        switch (item.getQcStatus()) {
            case APPROVED -> {
                if (item.getRejectedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                    throw new BusinessConflictException("Approved GRN item cannot have rejected quantity");
                }
            }
            case REJECTED -> {
                if (item.getAcceptedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                    throw new BusinessConflictException("Rejected GRN item cannot have accepted quantity");
                }
            }
            case PARTIALLY_APPROVED -> {
                if (item.getAcceptedQuantity().compareTo(BigDecimal.ZERO) <= 0
                        || item.getRejectedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BusinessConflictException("Partially approved GRN item must have both accepted and rejected quantity");
                }
            }
            default -> {
            }
        }
    }

    private InventoryResponse toResponse(Inventory inventory) {
        return InventoryResponse.builder()
                .id(inventory.getId())
                .materialId(inventory.getMaterialId())
                .batchId(inventory.getBatchId())
                .palletId(inventory.getPalletId())
                .quantityOnHand(inventory.getQuantityOnHand())
                .uom(inventory.getUom())
                .status(inventory.getStatus())
                .isActive(inventory.getIsActive())
                .createdBy(inventory.getCreatedBy())
                .createdAt(inventory.getCreatedAt())
                .updatedBy(inventory.getUpdatedBy())
                .updatedAt(inventory.getUpdatedAt())
                .build();
    }

    private InventoryTransactionResponse toTransactionResponse(InventoryTransaction transaction) {
        return InventoryTransactionResponse.builder()
                .id(transaction.getId())
                .inventoryId(transaction.getInventoryId())
                .materialId(transaction.getMaterialId())
                .batchId(transaction.getBatchId())
                .palletId(transaction.getPalletId())
                .transactionType(transaction.getTransactionType())
                .referenceType(transaction.getReferenceType())
                .referenceId(transaction.getReferenceId())
                .quantity(transaction.getQuantity())
                .uom(transaction.getUom())
                .remarks(transaction.getRemarks())
                .createdBy(transaction.getCreatedBy())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
