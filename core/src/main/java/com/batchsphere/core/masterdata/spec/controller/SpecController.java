package com.batchsphere.core.masterdata.spec.controller;

import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.service.SpecService;
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
@RequestMapping("/api/specs")
@RequiredArgsConstructor
public class SpecController {

    private final SpecService specService;

    @PostMapping
    public ResponseEntity<Spec> createSpec(@Valid @RequestBody SpecRequest request) {
        return ResponseEntity.ok(specService.createSpec(request));
    }

    @GetMapping
    public ResponseEntity<List<Spec>> getAllSpecs() {
        return ResponseEntity.ok(specService.getAllSpecs());
    }
}
