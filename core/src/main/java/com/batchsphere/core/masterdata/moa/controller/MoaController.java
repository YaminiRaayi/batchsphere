package com.batchsphere.core.masterdata.moa.controller;

import com.batchsphere.core.masterdata.quality.dto.RejectRequest;
import com.batchsphere.core.masterdata.quality.dto.ReviewSubmissionRequest;
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

    @PostMapping("/{id}/submit")
    public ResponseEntity<Moa> submitMoa(@PathVariable UUID id, @RequestBody(required = false) ReviewSubmissionRequest request) {
        return ResponseEntity.ok(moaService.submitMoa(id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Moa> approveMoa(@PathVariable UUID id) {
        return ResponseEntity.ok(moaService.approveMoa(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Moa> rejectMoa(@PathVariable UUID id, @Valid @RequestBody RejectRequest request) {
        return ResponseEntity.ok(moaService.rejectMoa(id, request));
    }

    @PostMapping("/{id}/obsolete")
    public ResponseEntity<Moa> obsoleteMoa(@PathVariable UUID id) {
        return ResponseEntity.ok(moaService.obsoleteMoa(id));
    }

    @GetMapping("/review-queue")
    public ResponseEntity<List<Moa>> getReviewQueue() {
        return ResponseEntity.ok(moaService.getReviewQueue());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateMoa(@PathVariable UUID id) {
        moaService.deactivateMoa(id);
        return ResponseEntity.noContent().build();
    }
}
