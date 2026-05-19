package com.batchsphere.core.lims.logbook.controller;

import com.batchsphere.core.lims.logbook.dto.InstrumentLogbookDtos.CreateInstrumentUsageLogRequest;
import com.batchsphere.core.lims.logbook.dto.InstrumentLogbookDtos.InstrumentUsageLogResponse;
import com.batchsphere.core.lims.logbook.service.InstrumentLogbookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InstrumentLogbookController {
    private final InstrumentLogbookService logbookService;

    @PostMapping("/api/lims/logbook")
    public ResponseEntity<InstrumentUsageLogResponse> create(@RequestBody CreateInstrumentUsageLogRequest request,
                                                             Authentication authentication) {
        String actor = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(logbookService.createManualEntry(request, actor));
    }

    @GetMapping("/api/lims/logbook")
    public ResponseEntity<List<InstrumentUsageLogResponse>> list(@RequestParam(required = false) String usedBy) {
        return ResponseEntity.ok(logbookService.getLogbook(usedBy));
    }

    @GetMapping("/api/lims/equipment/{id}/logbook")
    public ResponseEntity<List<InstrumentUsageLogResponse>> equipmentLogbook(@PathVariable UUID id) {
        return ResponseEntity.ok(logbookService.getEquipmentLogbook(id));
    }
}
