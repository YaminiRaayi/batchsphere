package com.batchsphere.core.masterdata.samplingtool.controller;

import com.batchsphere.core.masterdata.samplingtool.dto.SamplingToolRequest;
import com.batchsphere.core.masterdata.samplingtool.entity.SamplingTool;
import com.batchsphere.core.masterdata.samplingtool.service.SamplingToolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sampling-tools")
@RequiredArgsConstructor
public class SamplingToolController {

    private final SamplingToolService samplingToolService;

    @PostMapping
    public ResponseEntity<SamplingTool> createSamplingTool(@Valid @RequestBody SamplingToolRequest request) {
        return ResponseEntity.ok(samplingToolService.createSamplingTool(request));
    }

    @GetMapping
    public ResponseEntity<List<SamplingTool>> getAllSamplingTools() {
        return ResponseEntity.ok(samplingToolService.getAllSamplingTools());
    }
}
