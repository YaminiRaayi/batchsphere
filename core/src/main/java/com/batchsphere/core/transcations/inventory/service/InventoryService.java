package com.batchsphere.core.transcations.inventory.service;

import com.batchsphere.core.transcations.grn.entity.GrnItem;
import com.batchsphere.core.transcations.inventory.entity.InventoryStatus;
import com.batchsphere.core.transcations.inventory.dto.InventoryResponse;
import com.batchsphere.core.transcations.inventory.dto.InventoryTransactionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface InventoryService {

    Page<InventoryResponse> getAllInventory(Pageable pageable);

    InventoryResponse getInventoryById(UUID id);

    Page<InventoryTransactionResponse> getAllInventoryTransactions(Pageable pageable);

    void recordGrnReceipt(UUID grnId, List<GrnItem> items, String actor);

    void updateInventoryStatusForGrnItem(UUID grnItemId, InventoryStatus status, String actor);
}
