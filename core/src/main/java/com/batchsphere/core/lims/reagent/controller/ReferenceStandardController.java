package com.batchsphere.core.lims.reagent.controller;

import com.batchsphere.core.report.CsvExportService;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.CreateReferenceStandardLotRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.CreateReferenceStandardRequest;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.ReferenceStandardLotResponse;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.ReferenceStandardResponse;
import com.batchsphere.core.lims.reagent.dto.ReferenceStandardDtos.UpdateReferenceStandardLotRequest;
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
@RequestMapping("/api/lims/reference-standards")
@RequiredArgsConstructor
public class ReferenceStandardController {
    private final ReagentInventoryService service;
    private final CsvExportService csvExportService;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String format,
                                  @RequestHeader(value = "Accept", required = false) String accept) {
        List<ReferenceStandardResponse> rows = service.listReferenceStandards();
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("reference-standards.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @PostMapping
    public ResponseEntity<ReferenceStandardResponse> create(@RequestBody CreateReferenceStandardRequest request) {
        return ResponseEntity.ok(service.createReferenceStandard(request));
    }

    @GetMapping("/expiring")
    public ResponseEntity<?> expiring(@RequestParam(defaultValue = "30") int alertDays,
                                      @RequestParam(required = false) String format,
                                      @RequestHeader(value = "Accept", required = false) String accept) {
        List<ReferenceStandardLotResponse> rows = service.expiringReferenceStandardLots(alertDays);
        if (csvExportService.requested(format, accept)) {
            return csvExportService.response("reference-standard-expiry.csv", rows);
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{id}/lots")
    public ResponseEntity<List<ReferenceStandardLotResponse>> lots(@PathVariable UUID id) {
        return ResponseEntity.ok(service.listReferenceStandardLots(id));
    }

    @PostMapping("/{id}/lots")
    public ResponseEntity<ReferenceStandardLotResponse> addLot(@PathVariable UUID id, @RequestBody CreateReferenceStandardLotRequest request) {
        return ResponseEntity.ok(service.addReferenceStandardLot(id, request));
    }

    @PutMapping("/{id}/lots/{lotId}")
    public ResponseEntity<ReferenceStandardLotResponse> updateLot(@PathVariable UUID id, @PathVariable UUID lotId, @RequestBody UpdateReferenceStandardLotRequest request) {
        return ResponseEntity.ok(service.updateReferenceStandardLot(id, lotId, request));
    }
}
