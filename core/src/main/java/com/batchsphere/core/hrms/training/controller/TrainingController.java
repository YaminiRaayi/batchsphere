package com.batchsphere.core.hrms.training.controller;

import com.batchsphere.core.hrms.training.dto.CompleteTrainingAssignmentRequest;
import com.batchsphere.core.hrms.training.dto.CreateRoleQualificationRequirementRequest;
import com.batchsphere.core.hrms.training.dto.CreateTrainingAssignmentRequest;
import com.batchsphere.core.hrms.training.dto.RoleQualificationRequirementResponse;
import com.batchsphere.core.hrms.training.dto.TrainingAssignmentResponse;
import com.batchsphere.core.hrms.training.service.TrainingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/training")
@RequiredArgsConstructor
public class TrainingController {

    private final TrainingService trainingService;

    @PostMapping("/assignments")
    public ResponseEntity<TrainingAssignmentResponse> createAssignment(@Valid @RequestBody CreateTrainingAssignmentRequest request) {
        return ResponseEntity.ok(trainingService.createAssignment(request));
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<TrainingAssignmentResponse>> getAssignments(@RequestParam(required = false) UUID employeeId) {
        return ResponseEntity.ok(trainingService.getAssignments(employeeId));
    }

    @GetMapping("/my-assignments")
    public ResponseEntity<List<TrainingAssignmentResponse>> getMyAssignments() {
        return ResponseEntity.ok(trainingService.getMyAssignments());
    }

    @PutMapping("/assignments/{id}/complete")
    public ResponseEntity<TrainingAssignmentResponse> completeAssignment(@PathVariable UUID id,
                                                                         @RequestBody CompleteTrainingAssignmentRequest request) {
        return ResponseEntity.ok(trainingService.completeAssignment(id, request));
    }

    @PostMapping("/requirements")
    public ResponseEntity<RoleQualificationRequirementResponse> createRequirement(@Valid @RequestBody CreateRoleQualificationRequirementRequest request) {
        return ResponseEntity.ok(trainingService.createRequirement(request));
    }

    @GetMapping("/requirements")
    public ResponseEntity<List<RoleQualificationRequirementResponse>> getRequirements() {
        return ResponseEntity.ok(trainingService.getRequirements());
    }
}
