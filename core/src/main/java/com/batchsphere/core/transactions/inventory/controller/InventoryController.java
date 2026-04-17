package com.batchsphere.core.transactions.inventory.controller;

import com.batchsphere.core.transactions.inventory.dto.InventoryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventoryStatusUpdateRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransactionResponse;
import com.batchsphere.core.transactions.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<Page<InventoryResponse>> getAllInventory(Pageable pageable) {
        return ResponseEntity.ok(inventoryService.getAllInventory(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryResponse> getInventoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(inventoryService.getInventoryById(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<InventoryResponse> updateInventoryStatus(@PathVariable UUID id,
                                                                   @Valid @RequestBody InventoryStatusUpdateRequest request) {
        return ResponseEntity.ok(inventoryService.updateInventoryStatus(id, request));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<InventoryTransactionResponse>> getAllInventoryTransactions(Pageable pageable) {
        return ResponseEntity.ok(inventoryService.getAllInventoryTransactions(pageable));
    }
}
