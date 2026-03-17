package com.batchsphere.core.transcations.inventory.controller;

import com.batchsphere.core.transcations.inventory.dto.InventoryResponse;
import com.batchsphere.core.transcations.inventory.dto.InventoryTransactionResponse;
import com.batchsphere.core.transcations.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/transactions")
    public ResponseEntity<Page<InventoryTransactionResponse>> getAllInventoryTransactions(Pageable pageable) {
        return ResponseEntity.ok(inventoryService.getAllInventoryTransactions(pageable));
    }
}
