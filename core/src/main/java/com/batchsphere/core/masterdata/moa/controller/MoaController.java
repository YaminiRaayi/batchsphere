package com.batchsphere.core.masterdata.moa.controller;

import com.batchsphere.core.masterdata.moa.dto.MoaRequest;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.service.MoaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/moas")
@RequiredArgsConstructor
public class MoaController {

    private final MoaService moaService;

    @PostMapping
    public ResponseEntity<Moa> createMoa(@Valid @RequestBody MoaRequest request) {
        return ResponseEntity.ok(moaService.createMoa(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Moa> getMoaById(@PathVariable UUID id) {
        return ResponseEntity.ok(moaService.getMoaById(id));
    }

    @GetMapping
    public ResponseEntity<List<Moa>> getAllMoas() {
        return ResponseEntity.ok(moaService.getAllMoas());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Moa> updateMoa(@PathVariable UUID id, @Valid @RequestBody MoaRequest request) {
        return ResponseEntity.ok(moaService.updateMoa(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateMoa(@PathVariable UUID id) {
        moaService.deactivateMoa(id);
        return ResponseEntity.noContent().build();
    }
}
