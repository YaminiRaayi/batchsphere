package com.batchsphere.core.transactions.inventory.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.inventory.dto.InventoryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventoryStatusUpdateRequest;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final AuthenticatedActorService authenticatedActorService;

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
