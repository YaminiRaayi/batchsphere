package com.batchsphere.core.masterdata.spec.controller;

import com.batchsphere.core.masterdata.quality.dto.RejectRequest;
import com.batchsphere.core.masterdata.quality.dto.ReviewSubmissionRequest;
import com.batchsphere.core.masterdata.spec.dto.SpecParameterRequest;
import com.batchsphere.core.masterdata.spec.entity.MaterialSpecLink;
import com.batchsphere.core.masterdata.spec.entity.SpecParameter;
import com.batchsphere.core.masterdata.spec.dto.SpecRequest;
import com.batchsphere.core.masterdata.spec.entity.Spec;
import com.batchsphere.core.masterdata.spec.service.SpecParameterService;
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
    private final SpecParameterService specParameterService;

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

    @PostMapping("/{id}/submit")
    public ResponseEntity<Spec> submitSpec(@PathVariable UUID id, @RequestBody(required = false) ReviewSubmissionRequest request) {
        return ResponseEntity.ok(specService.submitSpec(id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Spec> approveSpec(@PathVariable UUID id) {
        return ResponseEntity.ok(specService.approveSpec(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Spec> rejectSpec(@PathVariable UUID id, @Valid @RequestBody RejectRequest request) {
        return ResponseEntity.ok(specService.rejectSpec(id, request));
    }

    @PostMapping("/{id}/revise")
    public ResponseEntity<Spec> reviseSpec(@PathVariable UUID id) {
        return ResponseEntity.ok(specService.reviseSpec(id));
    }

    @PostMapping("/{id}/obsolete")
    public ResponseEntity<Spec> obsoleteSpec(@PathVariable UUID id) {
        return ResponseEntity.ok(specService.obsoleteSpec(id));
    }

    @GetMapping("/review-queue")
    public ResponseEntity<List<Spec>> getReviewQueue() {
        return ResponseEntity.ok(specService.getReviewQueue());
    }

    @GetMapping("/{id}/material-links")
    public ResponseEntity<List<MaterialSpecLink>> getMaterialLinks(@PathVariable UUID id) {
        return ResponseEntity.ok(specService.getMaterialLinks(id));
    }

    @PostMapping("/{id}/parameters")
    public ResponseEntity<SpecParameter> createParameter(@PathVariable UUID id, @Valid @RequestBody SpecParameterRequest request) {
        return ResponseEntity.ok(specParameterService.createParameter(id, request));
    }

    @GetMapping("/{id}/parameters")
    public ResponseEntity<List<SpecParameter>> getParameters(@PathVariable UUID id) {
        return ResponseEntity.ok(specParameterService.getParameters(id));
    }

    @PutMapping("/{id}/parameters/{parameterId}")
    public ResponseEntity<SpecParameter> updateParameter(@PathVariable UUID id,
                                                         @PathVariable UUID parameterId,
                                                         @Valid @RequestBody SpecParameterRequest request) {
        return ResponseEntity.ok(specParameterService.updateParameter(id, parameterId, request));
    }

    @DeleteMapping("/{id}/parameters/{parameterId}")
    public ResponseEntity<Void> deleteParameter(@PathVariable UUID id, @PathVariable UUID parameterId) {
        specParameterService.deleteParameter(id, parameterId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateSpec(@PathVariable UUID id) {
        specService.deactivateSpec(id);
        return ResponseEntity.noContent().build();
    }
}
