package com.batchsphere.core.masterdata.spec.controller;

import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.service.SpecService;
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
@RequestMapping("/api/specs")
@RequiredArgsConstructor
public class SpecController {

    private final SpecService specService;

    @PostMapping
    public ResponseEntity<Spec> createSpec(@Valid @RequestBody SpecRequest request) {
        return ResponseEntity.ok(specService.createSpec(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Spec> getSpecById(@PathVariable UUID id) {
        return ResponseEntity.ok(specService.getSpecById(id));
    }

    @GetMapping
    public ResponseEntity<List<Spec>> getAllSpecs() {
        return ResponseEntity.ok(specService.getAllSpecs());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Spec> updateSpec(@PathVariable UUID id, @Valid @RequestBody SpecRequest request) {
        return ResponseEntity.ok(specService.updateSpec(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateSpec(@PathVariable UUID id) {
        specService.deactivateSpec(id);
        return ResponseEntity.noContent().build();
    }
}
