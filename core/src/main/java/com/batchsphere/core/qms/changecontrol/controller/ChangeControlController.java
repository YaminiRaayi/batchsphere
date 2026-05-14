package com.batchsphere.core.qms.changecontrol.controller;

import com.batchsphere.core.qms.changecontrol.dto.*;
import com.batchsphere.core.qms.changecontrol.service.ChangeControlService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/change-controls")
@RequiredArgsConstructor
public class ChangeControlController {

    private final ChangeControlService service;

    @PostMapping
    public ResponseEntity<ChangeControlResponse> create(@Valid @RequestBody CreateChangeControlRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @GetMapping
    public ResponseEntity<Page<ChangeControlResponse>> getAll(Pageable pageable) {
        return ResponseEntity.ok(service.getAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChangeControlResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChangeControlResponse> update(@PathVariable UUID id,
                                                        @Valid @RequestBody UpdateChangeControlRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PostMapping("/{id}/submit-for-review")
    public ResponseEntity<ChangeControlResponse> submitForReview(@PathVariable UUID id) {
        return ResponseEntity.ok(service.submitForReview(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ChangeControlResponse> approve(@PathVariable UUID id,
                                                         @Valid @RequestBody ChangeControlApproveRequest request) {
        return ResponseEntity.ok(service.approve(id, request));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ChangeControlResponse> reject(@PathVariable UUID id,
                                                        @Valid @RequestBody ChangeControlRejectRequest request) {
        return ResponseEntity.ok(service.reject(id, request));
    }

    @PostMapping("/{id}/start-implementation")
    public ResponseEntity<ChangeControlResponse> startImplementation(@PathVariable UUID id) {
        return ResponseEntity.ok(service.startImplementation(id));
    }

    @PostMapping("/{id}/move-to-effectiveness-check")
    public ResponseEntity<ChangeControlResponse> moveToEffectivenessCheck(@PathVariable UUID id) {
        return ResponseEntity.ok(service.moveToEffectivenessCheck(id));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<ChangeControlResponse> close(@PathVariable UUID id,
                                                       @Valid @RequestBody ChangeControlCloseRequest request) {
        return ResponseEntity.ok(service.close(id, request));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ChangeControlResponse> cancel(@PathVariable UUID id,
                                                        @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(service.cancel(id, reason));
    }

    @PostMapping("/{id}/affected-entities")
    public ResponseEntity<ChangeControlAffectedEntityResponse> addAffectedEntity(
            @PathVariable UUID id, @Valid @RequestBody AddAffectedEntityRequest request) {
        return ResponseEntity.ok(service.addAffectedEntity(id, request));
    }

    @DeleteMapping("/{id}/affected-entities/{entityId}")
    public ResponseEntity<Void> removeAffectedEntity(@PathVariable UUID id, @PathVariable UUID entityId) {
        service.removeAffectedEntity(id, entityId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/tasks")
    public ResponseEntity<ChangeControlTaskResponse> addTask(
            @PathVariable UUID id, @Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.ok(service.addTask(id, request));
    }

    @PutMapping("/{id}/tasks/{taskId}/status")
    public ResponseEntity<ChangeControlTaskResponse> updateTaskStatus(
            @PathVariable UUID id, @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request) {
        return ResponseEntity.ok(service.updateTaskStatus(id, taskId, request));
    }

    @DeleteMapping("/{id}/tasks/{taskId}")
    public ResponseEntity<Void> removeTask(@PathVariable UUID id, @PathVariable UUID taskId) {
        service.removeTask(id, taskId);
        return ResponseEntity.noContent().build();
    }
}
