package com.batchsphere.core.transactions.inventory.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.batch.entity.Batch;
import com.batchsphere.core.batch.repository.BatchRepository;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.masterdata.material.entity.Material;
import com.batchsphere.core.masterdata.material.repository.MaterialRepository;
import com.batchsphere.core.masterdata.warehouselocation.entity.Pallet;
import com.batchsphere.core.masterdata.warehouselocation.entity.Rack;
import com.batchsphere.core.masterdata.warehouselocation.entity.Room;
import com.batchsphere.core.masterdata.warehouselocation.entity.Shelf;
import com.batchsphere.core.masterdata.warehouselocation.entity.Warehouse;
import com.batchsphere.core.masterdata.warehouselocation.entity.WarehouseZoneRule;
import com.batchsphere.core.masterdata.warehouselocation.repository.PalletRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RackRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.RoomRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.ShelfRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseRepository;
import com.batchsphere.core.masterdata.warehouselocation.repository.WarehouseZoneRuleRepository;
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
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.HashMap;
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
    private final WarehouseZoneRuleRepository warehouseZoneRuleRepository;
    private final MaterialRepository materialRepository;
    private final BatchRepository batchRepository;

    private static final Map<InventoryStatus, EnumSet<InventoryStatus>> ALLOWED_TRANSITIONS = Map.of(
            InventoryStatus.QUARANTINE, EnumSet.of(InventoryStatus.SAMPLING),
            InventoryStatus.SAMPLING, EnumSet.of(InventoryStatus.UNDER_TEST),
            InventoryStatus.UNDER_TEST, EnumSet.of(InventoryStatus.SAMPLING, InventoryStatus.RELEASED, InventoryStatus.REJECTED, InventoryStatus.BLOCKED),
            InventoryStatus.RELEASED, EnumSet.noneOf(InventoryStatus.class),
            InventoryStatus.REJECTED, EnumSet.noneOf(InventoryStatus.class),
            InventoryStatus.BLOCKED, EnumSet.of(InventoryStatus.UNDER_TEST, InventoryStatus.SAMPLING, InventoryStatus.REJECTED)
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
        return toResponse(transitionInventoryStatus(
                inventory,
                targetStatus,
                actor,
                InventoryReferenceType.INVENTORY,
                inventory.getId(),
                request.getRemarks()
        ));
    }

    @Override
    @Transactional
    public InventoryResponse adjustInventory(UUID id, InventoryAdjustmentRequest request) {
        String actor = authenticatedActorService.currentActor();
        Inventory inventory = getActiveInventory(id);
        validateFefoReduction(inventory, request);
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
        validateDestinationRoomRules(sourceInventory, destinationPallet);

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
        transitionInventoryStatus(
                materialId,
                batchId,
                palletId,
                status,
                actor,
                InventoryReferenceType.INVENTORY,
                null,
                null
        );
    }

    @Override
    @Transactional
    public void transitionInventoryStatus(UUID materialId,
                                          UUID batchId,
                                          UUID palletId,
                                          InventoryStatus status,
                                          String actor,
                                          InventoryReferenceType referenceType,
                                          UUID referenceId,
                                          String remarks) {
        Inventory inventory = inventoryRepository.findByMaterialIdAndBatchIdAndPalletId(
                        materialId,
                        batchId,
                        palletId
                )
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for material, batch and pallet"));

        transitionInventoryStatus(inventory, status, actor, referenceType, referenceId, remarks);
    }

    private Inventory transitionInventoryStatus(Inventory inventory,
                                                InventoryStatus targetStatus,
                                                String actor,
                                                InventoryReferenceType referenceType,
                                                UUID referenceId,
                                                String remarks) {
        validateStatusTransition(inventory.getStatus(), targetStatus, referenceType);

        if (inventory.getStatus() == targetStatus) {
            return inventory;
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
                .referenceType(referenceType != null ? referenceType : InventoryReferenceType.INVENTORY)
                .referenceId(referenceId != null ? referenceId : savedInventory.getId())
                .quantity(savedInventory.getQuantityOnHand())
                .uom(savedInventory.getUom())
                .remarks(buildStatusChangeRemarks(previousStatus, targetStatus, remarks))
                .createdBy(actor)
                .createdAt(now)
                .build());

        return savedInventory;
    }

    private void validateStatusTransition(InventoryStatus currentStatus,
                                          InventoryStatus targetStatus,
                                          InventoryReferenceType referenceType) {
        if (currentStatus == targetStatus) {
            return;
        }

        if (referenceType == InventoryReferenceType.SAMPLING_REQUEST
                && currentStatus == InventoryStatus.QUARANTINE
                && EnumSet.of(InventoryStatus.RELEASED, InventoryStatus.REJECTED).contains(targetStatus)) {
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

    private void validateDestinationRoomRules(Inventory inventory, Pallet destinationPallet) {
        Material material = materialRepository.findById(inventory.getMaterialId())
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id: " + inventory.getMaterialId()));
        Room destinationRoom = getRoomForPallet(destinationPallet);
        List<WarehouseZoneRule> rules = warehouseZoneRuleRepository.findByRoomIdAndIsActiveTrueOrderByZoneNameAsc(destinationRoom.getId());

        if (rules.isEmpty()) {
            return;
        }

        List<WarehouseZoneRule> compatibleRules = rules.stream()
                .filter(rule -> isCompatibleRule(rule, material))
                .toList();

        if (!compatibleRules.isEmpty()) {
          rules = compatibleRules;
        }

        boolean quarantineStock = EnumSet.of(InventoryStatus.QUARANTINE, InventoryStatus.SAMPLING, InventoryStatus.UNDER_TEST)
                .contains(inventory.getStatus());
        boolean rejectedStock = EnumSet.of(InventoryStatus.REJECTED, InventoryStatus.BLOCKED)
                .contains(inventory.getStatus());

        if (quarantineStock && rules.stream().noneMatch(rule -> Boolean.TRUE.equals(rule.getQuarantineOnly()))) {
            throw new BusinessConflictException("Destination room is not configured for quarantine / under-test stock");
        }

        if (rejectedStock && rules.stream().noneMatch(rule -> Boolean.TRUE.equals(rule.getRejectedOnly()))) {
            throw new BusinessConflictException("Destination room is not configured for rejected / blocked stock");
        }

        if (!quarantineStock && !rejectedStock
                && rules.stream().anyMatch(rule -> Boolean.TRUE.equals(rule.getQuarantineOnly()) || Boolean.TRUE.equals(rule.getRejectedOnly()))) {
            throw new BusinessConflictException("Released stock cannot be moved into quarantine-only or rejected-only room");
        }
    }

    private boolean isCompatibleRule(WarehouseZoneRule rule, Material material) {
        boolean materialTypeMatch = rule.getAllowedMaterialType() == null
                || rule.getAllowedMaterialType().isBlank()
                || rule.getAllowedMaterialType().equalsIgnoreCase(material.getMaterialType());
        boolean storageConditionMatch = rule.getAllowedStorageCondition() == null
                || rule.getAllowedStorageCondition() == material.getStorageCondition();
        return materialTypeMatch && storageConditionMatch;
    }

    private void validateFefoReduction(Inventory inventory, InventoryAdjustmentRequest request) {
        if (Boolean.TRUE.equals(request.getIncrease())
                || inventory.getStatus() != InventoryStatus.RELEASED
                || request.getQuantityDelta().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        List<Inventory> releasedLots = inventoryRepository.findByMaterialIdAndStatusAndIsActiveTrue(
                inventory.getMaterialId(),
                InventoryStatus.RELEASED
        ).stream()
                .filter(candidate -> candidate.getQuantityOnHand() != null && candidate.getQuantityOnHand().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        if (releasedLots.size() <= 1) {
            return;
        }

        Map<UUID, Batch> batchesById = new HashMap<>();
        for (Batch batch : batchRepository.findAllById(releasedLots.stream().map(Inventory::getBatchId).distinct().toList())) {
            batchesById.put(batch.getId(), batch);
        }

        List<Inventory> fefoOrderedLots = releasedLots.stream()
                .sorted(Comparator
                        .comparing((Inventory candidate) -> getFefoDate(batchesById.get(candidate.getBatchId())),
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(candidate -> batchesById.get(candidate.getBatchId()) != null
                                ? batchesById.get(candidate.getBatchId()).getBatchNumber()
                                : candidate.getId().toString()))
                .toList();

        Inventory firstAvailableLot = fefoOrderedLots.get(0);
        if (!firstAvailableLot.getId().equals(inventory.getId())) {
            Batch requestedBatch = batchesById.get(inventory.getBatchId());
            Batch firstBatch = batchesById.get(firstAvailableLot.getBatchId());
            throw new BusinessConflictException(
                    "FEFO violation: consume batch "
                            + (firstBatch != null ? firstBatch.getBatchNumber() : firstAvailableLot.getId())
                            + " first before reducing batch "
                            + (requestedBatch != null ? requestedBatch.getBatchNumber() : inventory.getId())
            );
        }
    }

    private LocalDate getFefoDate(Batch batch) {
        if (batch == null) {
            return null;
        }
        if (batch.getExpiryDate() != null) {
            return batch.getExpiryDate();
        }
        return batch.getRetestDate();
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
        Shelf shelf = getShelfForPallet(pallet);
        Rack rack = getRackForShelf(shelf);
        Room room = getRoomForRack(rack);
        Warehouse warehouse = warehouseRepository.findById(room.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + room.getWarehouseId()));
        return warehouse.getWarehouseCode()
                + "/" + room.getRoomCode()
                + "/" + rack.getRackCode()
                + "/" + shelf.getShelfCode()
                + "/" + pallet.getPalletCode();
    }

    private Shelf getShelfForPallet(Pallet pallet) {
        return shelfRepository.findById(pallet.getShelfId())
                .orElseThrow(() -> new ResourceNotFoundException("Shelf not found with id: " + pallet.getShelfId()));
    }

    private Rack getRackForShelf(Shelf shelf) {
        return rackRepository.findById(shelf.getRackId())
                .orElseThrow(() -> new ResourceNotFoundException("Rack not found with id: " + shelf.getRackId()));
    }

    private Room getRoomForRack(Rack rack) {
        return roomRepository.findById(rack.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + rack.getRoomId()));
    }

    private Room getRoomForPallet(Pallet pallet) {
        return getRoomForRack(getRackForShelf(getShelfForPallet(pallet)));
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
