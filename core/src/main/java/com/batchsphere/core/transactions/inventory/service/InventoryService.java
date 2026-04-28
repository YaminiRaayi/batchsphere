package com.batchsphere.core.transactions.inventory.service;

import com.batchsphere.core.transactions.inventory.dto.InventoryAdjustmentRequest;
import com.batchsphere.core.transactions.grn.entity.GrnItem;
import com.batchsphere.core.transactions.inventory.dto.InventorySummaryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransferRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryStatusUpdateRequest;
import com.batchsphere.core.transactions.inventory.entity.InventoryReferenceType;
import com.batchsphere.core.transactions.inventory.entity.InventoryStatus;
import com.batchsphere.core.transactions.inventory.dto.InventoryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransactionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface InventoryService {

    Page<InventoryResponse> getAllInventory(Pageable pageable);

    InventoryResponse getInventoryById(UUID id);

    Page<InventoryTransactionResponse> getAllInventoryTransactions(Pageable pageable);

    InventoryResponse adjustInventory(UUID id, InventoryAdjustmentRequest request);

    InventoryResponse transferInventory(UUID id, InventoryTransferRequest request);

    InventorySummaryResponse getInventorySummary();

    InventoryResponse updateInventoryStatus(UUID id, InventoryStatusUpdateRequest request);

    void recordGrnReceipt(UUID grnId, List<GrnItem> items, String actor);

    void updateInventoryStatusForGrnItem(UUID grnItemId, InventoryStatus status, String actor);

    void transitionInventoryStatus(UUID materialId,
                                   UUID batchId,
                                   UUID palletId,
                                   InventoryStatus status,
                                   String actor,
                                   InventoryReferenceType referenceType,
                                   UUID referenceId,
                                   String remarks);
}
