package com.batchsphere.core.masterdata.moa.controller;

import com.batchsphere.core.masterdata.moa.dto.MoaRequest;
import com.batchsphere.core.masterdata.moa.entity.Moa;
import com.batchsphere.core.masterdata.moa.service.MoaService;
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
@RequestMapping("/api/moas")
@RequiredArgsConstructor
public class MoaController {

    private final MoaService moaService;

    @PostMapping
    public ResponseEntity<Moa> createMoa(@Valid @RequestBody MoaRequest request) {
        return ResponseEntity.ok(moaService.createMoa(request));
    }

    @GetMapping
    public ResponseEntity<List<Moa>> getAllMoas() {
        return ResponseEntity.ok(moaService.getAllMoas());
    }
}
