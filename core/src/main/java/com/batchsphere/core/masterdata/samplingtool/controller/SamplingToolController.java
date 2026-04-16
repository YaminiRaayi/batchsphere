package com.batchsphere.core.masterdata.samplingtool.controller;

import com.batchsphere.core.masterdata.samplingtool.dto.SamplingToolRequest;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import com.batchsphere.core.masterdata.samplingtool.service.SamplingToolService;
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
@RequestMapping("/api/sampling-tools")
@RequiredArgsConstructor
public class SamplingToolController {

    private final SamplingToolService samplingToolService;

    @PostMapping
    public ResponseEntity<SamplingTool> createSamplingTool(@Valid @RequestBody SamplingToolRequest request) {
        return ResponseEntity.ok(samplingToolService.createSamplingTool(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SamplingTool> getSamplingToolById(@PathVariable UUID id) {
        return ResponseEntity.ok(samplingToolService.getSamplingToolById(id));
    }

    @GetMapping
    public ResponseEntity<List<SamplingTool>> getAllSamplingTools() {
        return ResponseEntity.ok(samplingToolService.getAllSamplingTools());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SamplingTool> updateSamplingTool(@PathVariable UUID id,
                                                           @Valid @RequestBody SamplingToolRequest request) {
        return ResponseEntity.ok(samplingToolService.updateSamplingTool(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateSamplingTool(@PathVariable UUID id) {
        samplingToolService.deactivateSamplingTool(id);
        return ResponseEntity.noContent().build();
    }
}
