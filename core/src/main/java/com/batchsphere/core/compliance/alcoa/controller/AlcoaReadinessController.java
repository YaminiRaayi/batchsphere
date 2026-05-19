package com.batchsphere.core.compliance.alcoa.controller;

import com.batchsphere.core.compliance.alcoa.dto.AlcoaReadinessGap;
import com.batchsphere.core.compliance.alcoa.dto.AlcoaReadinessSummary;
import com.batchsphere.core.compliance.alcoa.service.AlcoaReadinessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/compliance/alcoa-readiness")
@RequiredArgsConstructor
public class AlcoaReadinessController {

    private final AlcoaReadinessService alcoaReadinessService;

    @GetMapping("/summary")
    public ResponseEntity<AlcoaReadinessSummary> getSummary() {
        return ResponseEntity.ok(alcoaReadinessService.getSummary());
    }

    @GetMapping("/gaps")
    public ResponseEntity<List<AlcoaReadinessGap>> getGaps() {
        return ResponseEntity.ok(alcoaReadinessService.getGaps());
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsv() {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"alcoa-readiness.csv\"")
                .body(alcoaReadinessService.exportCsv());
    }
}
