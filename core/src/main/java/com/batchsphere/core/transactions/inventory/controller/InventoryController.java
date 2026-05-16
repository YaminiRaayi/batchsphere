package com.batchsphere.core.transactions.inventory.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.transactions.inventory.dto.InventoryAdjustmentRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryIssueRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventorySummaryResponse;
import com.batchsphere.core.transactions.inventory.dto.InventoryStatusUpdateRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransferRequest;
import com.batchsphere.core.transactions.inventory.dto.InventoryTransactionResponse;
import com.batchsphere.core.transactions.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final CsvExportService csvExportService;

    @GetMapping
    public ResponseEntity<?> getAllInventory(Pageable pageable,
                                             @RequestParam(required = false) String format,
                                             @RequestHeader(value = "Accept", required = false) String accept) {
        Page<InventoryResponse> page = inventoryService.getAllInventory(pageable);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("inventory.csv", page.getContent());
        }
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryResponse> getInventoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(inventoryService.getInventoryById(id));
    }

    @GetMapping("/summary")
    public ResponseEntity<InventorySummaryResponse> getInventorySummary() {
        return ResponseEntity.ok(inventoryService.getInventorySummary());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<InventoryResponse> updateInventoryStatus(@PathVariable UUID id,
                                                                   @Valid @RequestBody InventoryStatusUpdateRequest request) {
        return ResponseEntity.ok(inventoryService.updateInventoryStatus(id, request));
    }

    @PostMapping("/{id}/adjust")
    public ResponseEntity<InventoryResponse> adjustInventory(@PathVariable UUID id,
                                                             @Valid @RequestBody InventoryAdjustmentRequest request) {
        return ResponseEntity.ok(inventoryService.adjustInventory(id, request));
    }

    @PostMapping("/{id}/issue")
    public ResponseEntity<InventoryResponse> issueInventory(@PathVariable UUID id,
                                                            @Valid @RequestBody InventoryIssueRequest request) {
        return ResponseEntity.ok(inventoryService.issueInventory(id, request));
    }

    @PostMapping("/{id}/transfer")
    public ResponseEntity<InventoryResponse> transferInventory(@PathVariable UUID id,
                                                               @Valid @RequestBody InventoryTransferRequest request) {
        return ResponseEntity.ok(inventoryService.transferInventory(id, request));
    }

    @GetMapping("/transactions")
    public ResponseEntity<Page<InventoryTransactionResponse>> getAllInventoryTransactions(Pageable pageable) {
        return ResponseEntity.ok(inventoryService.getAllInventoryTransactions(pageable));
    }
}
