package com.batchsphere.core.traceability.controller;

import com.batchsphere.core.traceability.dto.LotTraceabilityResponse;
import com.batchsphere.core.traceability.service.LotTraceabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lots")
@RequiredArgsConstructor
public class LotTraceabilityController {

    private final LotTraceabilityService lotTraceabilityService;

    @GetMapping("/{searchKey}/traceability")
    public ResponseEntity<LotTraceabilityResponse> getTraceability(@PathVariable String searchKey) {
        return ResponseEntity.ok(lotTraceabilityService.getTraceability(searchKey));
    }
}
