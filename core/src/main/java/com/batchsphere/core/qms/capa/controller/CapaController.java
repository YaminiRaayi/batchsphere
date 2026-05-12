package com.batchsphere.core.qms.capa.controller;

import com.batchsphere.core.qms.capa.dto.CapaResponse;
import com.batchsphere.core.qms.capa.dto.CapaStatusUpdateRequest;
import com.batchsphere.core.qms.capa.dto.CapaSummaryResponse;
import com.batchsphere.core.qms.capa.dto.CreateCapaRequest;
import com.batchsphere.core.qms.capa.dto.UpdateCapaRequest;
import com.batchsphere.core.qms.capa.service.CapaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/capas")
@RequiredArgsConstructor
public class CapaController {

    private final CapaService capaService;

    @PostMapping
    public ResponseEntity<CapaResponse> createCapa(@Valid @RequestBody CreateCapaRequest request) {
        return ResponseEntity.ok(capaService.createCapa(request));
    }

    @GetMapping
    public ResponseEntity<Page<CapaResponse>> getAllCapas(@RequestParam(required = false) UUID deviationId,
                                                          Pageable pageable) {
        return ResponseEntity.ok(capaService.getAllCapas(deviationId, pageable));
    }

    @GetMapping("/summary")
    public ResponseEntity<CapaSummaryResponse> getSummary() {
        return ResponseEntity.ok(capaService.getSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CapaResponse> getCapaById(@PathVariable UUID id) {
        return ResponseEntity.ok(capaService.getCapaById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CapaResponse> updateCapa(@PathVariable UUID id, @Valid @RequestBody UpdateCapaRequest request) {
        return ResponseEntity.ok(capaService.updateCapa(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<CapaResponse> updateStatus(@PathVariable UUID id,
                                                     @Valid @RequestBody CapaStatusUpdateRequest request) {
        return ResponseEntity.ok(capaService.updateStatus(id, request));
    }
}
