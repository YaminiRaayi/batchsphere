package com.batchsphere.core.lims.reagent.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.CreateReagentLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.CreateReagentRequest;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.ReagentLotResponse;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.ReagentResponse;
import com.batchsphere.core.lims.reagent.dto.ReagentDtos.UpdateReagentLotRequest;
import com.batchsphere.core.lims.reagent.service.ReagentInventoryService;
import lombok.RequiredArgsConstructor;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lims/reagents")
@RequiredArgsConstructor
public class ReagentController {
    private final ReagentInventoryService service;
    private final CsvExportService csvExportService;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String format,
                                  @RequestHeader(value = "Accept", required = false) String accept) {
        List<ReagentResponse> rows = service.listReagents();
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("reagents.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @PostMapping
    public ResponseEntity<ReagentResponse> create(@RequestBody CreateReagentRequest request) {
        return ResponseEntity.ok(service.createReagent(request));
    }

    @GetMapping("/expiring")
    public ResponseEntity<?> expiring(@RequestParam(defaultValue = "30") int alertDays,
                                      @RequestParam(required = false) String format,
                                      @RequestHeader(value = "Accept", required = false) String accept) {
        List<ReagentLotResponse> rows = service.expiringLots(alertDays);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("reagent-expiry.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/lots/available")
    public ResponseEntity<List<ReagentLotResponse>> availableLots() {
        return ResponseEntity.ok(service.availableLots());
    }

    @GetMapping("/{id}/lots")
    public ResponseEntity<List<ReagentLotResponse>> lots(@PathVariable UUID id) {
        return ResponseEntity.ok(service.listLots(id));
    }

    @PostMapping("/{id}/lots")
    public ResponseEntity<ReagentLotResponse> addLot(@PathVariable UUID id, @RequestBody CreateReagentLotRequest request) {
        return ResponseEntity.ok(service.addLot(id, request));
    }

    @PutMapping("/{id}/lots/{lotId}")
    public ResponseEntity<ReagentLotResponse> updateLot(@PathVariable UUID id, @PathVariable UUID lotId, @RequestBody UpdateReagentLotRequest request) {
        return ResponseEntity.ok(service.updateLot(id, lotId, request));
    }
}
