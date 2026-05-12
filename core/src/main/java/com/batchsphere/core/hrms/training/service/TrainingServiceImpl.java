package com.batchsphere.core.hrms.training.service;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.hrms.employee.entity.Employee;
import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.repository.EmployeeRepository;
import com.batchsphere.core.hrms.training.dto.CompleteTrainingAssignmentRequest;
import com.batchsphere.core.hrms.training.dto.CreateRoleQualificationRequirementRequest;
import com.batchsphere.core.hrms.training.dto.CreateTrainingAssignmentRequest;
import com.batchsphere.core.hrms.training.dto.RoleQualificationRequirementResponse;
import com.batchsphere.core.hrms.training.dto.TrainingAssignmentResponse;
import com.batchsphere.core.hrms.training.entity.RoleQualificationRequirement;
import com.batchsphere.core.hrms.training.entity.TrainingAssignment;
import com.batchsphere.core.hrms.training.entity.TrainingAssignmentStatus;
import com.batchsphere.core.hrms.training.repository.RoleQualificationRequirementRepository;
import com.batchsphere.core.hrms.training.repository.TrainingAssignmentRepository;
import com.batchsphere.core.qms.document.entity.ControlledDocument;
import com.batchsphere.core.qms.document.entity.DocumentRevision;
import com.batchsphere.core.qms.document.repository.ControlledDocumentRepository;
import com.batchsphere.core.qms.document.repository.DocumentRevisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TrainingServiceImpl implements TrainingService {

    private final TrainingAssignmentRepository assignmentRepository;
    private final RoleQualificationRequirementRepository requirementRepository;
    private final EmployeeRepository employeeRepository;
    private final ControlledDocumentRepository documentRepository;
    private final DocumentRevisionRepository revisionRepository;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;

    @Override
    @Transactional
    public TrainingAssignmentResponse createAssignment(CreateTrainingAssignmentRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .filter(Employee::getIsActive)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + request.getEmployeeId()));
        String actor = authenticatedActorService.currentActor();
        LocalDateTime now = LocalDateTime.now();
        TrainingAssignment assignment = assignmentRepository.save(TrainingAssignment.builder()
                .id(UUID.randomUUID())
                .assignmentCode("TRN-" + System.currentTimeMillis())
                .employeeId(employee.getId())
                .assignedUsername(trimRequired(request.getAssignedUsername(), "Assigned username is required"))
                .trainingTitle(trimRequired(request.getTrainingTitle(), "Training title is required"))
                .trainingType(request.getTrainingType())
                .documentId(request.getDocumentId())
                .revisionId(request.getRevisionId())
                .requiredRole(blankToNull(request.getRequiredRole()))
                .status(resolveStatus(request.getDueDate()))
                .dueDate(request.getDueDate())
                .assignedBy(actor)
                .assignedAt(now)
                .isActive(true)
                .build());
        employee.setQualificationStatus(EmployeeQualificationStatus.TRAINING_DUE);
        employee.setNextTrainingDue(request.getDueDate());
        employee.setUpdatedBy(actor);
        employee.setUpdatedAt(now);
        employeeRepository.save(employee);
        auditEventService.record("TRAINING_ASSIGNMENT", assignment.getId(), AuditEventType.CREATE, "status",
                null, assignment.getStatus().name(), "Training assigned", actor, "TRAINING");
        return toAssignmentResponse(assignment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrainingAssignmentResponse> getAssignments(UUID employeeId) {
        List<TrainingAssignment> assignments = employeeId == null
                ? assignmentRepository.findByIsActiveTrueOrderByAssignedAtDesc()
                : assignmentRepository.findByEmployeeIdAndIsActiveTrueOrderByAssignedAtDesc(employeeId);
        return assignments.stream().map(this::toAssignmentResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TrainingAssignmentResponse> getMyAssignments() {
        String actor = authenticatedActorService.currentActor();
        return assignmentRepository.findByAssignedUsernameAndIsActiveTrueOrderByAssignedAtDesc(actor)
                .stream()
                .map(this::toAssignmentResponse)
                .toList();
    }

    @Override
    @Transactional
    public TrainingAssignmentResponse completeAssignment(UUID id, CompleteTrainingAssignmentRequest request) {
        TrainingAssignment assignment = assignmentRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training assignment not found: " + id));
        String actor = authenticatedActorService.currentActor();
        if (!assignment.getAssignedUsername().equalsIgnoreCase(actor)) {
            throw new BusinessConflictException("Only the assigned user can complete this training");
        }
        if (assignment.getStatus() == TrainingAssignmentStatus.COMPLETED) {
            throw new BusinessConflictException("Training assignment is already completed");
        }
        LocalDateTime now = LocalDateTime.now();
        assignment.setStatus(TrainingAssignmentStatus.COMPLETED);
        assignment.setCompletedAt(now);
        assignment.setCompletedBy(actor);
        assignment.setCompletionComments(blankToNull(request.getComments()));
        TrainingAssignment saved = assignmentRepository.save(assignment);
        refreshEmployeeTrainingStatus(saved.getEmployeeId(), actor, now);
        auditEventService.record("TRAINING_ASSIGNMENT", saved.getId(), AuditEventType.STATUS_CHANGE, "status",
                null, TrainingAssignmentStatus.COMPLETED.name(), "Training completed", actor, "TRAINING");
        return toAssignmentResponse(saved);
    }

    @Override
    @Transactional
    public RoleQualificationRequirementResponse createRequirement(CreateRoleQualificationRequirementRequest request) {
        String actor = authenticatedActorService.currentActor();
        RoleQualificationRequirement requirement = requirementRepository.save(RoleQualificationRequirement.builder()
                .id(UUID.randomUUID())
                .roleName(trimRequired(request.getRoleName(), "Role name is required"))
                .trainingTitle(trimRequired(request.getTrainingTitle(), "Training title is required"))
                .trainingType(request.getTrainingType())
                .documentId(request.getDocumentId())
                .revisionId(request.getRevisionId())
                .recurrenceMonths(request.getRecurrenceMonths())
                .isMandatory(!Boolean.FALSE.equals(request.getIsMandatory()))
                .isActive(true)
                .createdBy(actor)
                .createdAt(LocalDateTime.now())
                .build());
        auditEventService.record("ROLE_QUALIFICATION_REQUIREMENT", requirement.getId(), AuditEventType.CREATE, "roleName",
                null, requirement.getRoleName(), "Role qualification requirement created", actor, "TRAINING");
        return toRequirementResponse(requirement);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleQualificationRequirementResponse> getRequirements() {
        return requirementRepository.findByIsActiveTrueOrderByRoleNameAscTrainingTitleAsc()
                .stream()
                .map(this::toRequirementResponse)
                .toList();
    }

    private void refreshEmployeeTrainingStatus(UUID employeeId, String actor, LocalDateTime now) {
        List<TrainingAssignment> employeeAssignments = assignmentRepository.findByEmployeeIdAndIsActiveTrueOrderByAssignedAtDesc(employeeId);
        boolean hasOpen = employeeAssignments.stream()
                .anyMatch(item -> item.getStatus() != TrainingAssignmentStatus.COMPLETED && item.getStatus() != TrainingAssignmentStatus.CANCELLED);
        Employee employee = employeeRepository.findById(employeeId).orElseThrow();
        employee.setLastTrainingDate(LocalDate.now());
        employee.setQualificationStatus(hasOpen ? EmployeeQualificationStatus.TRAINING_DUE : EmployeeQualificationStatus.QUALIFIED);
        employee.setNextTrainingDue(employeeAssignments.stream()
                .filter(item -> item.getStatus() != TrainingAssignmentStatus.COMPLETED && item.getDueDate() != null)
                .map(TrainingAssignment::getDueDate)
                .min(LocalDate::compareTo)
                .orElse(null));
        employee.setUpdatedBy(actor);
        employee.setUpdatedAt(now);
        employeeRepository.save(employee);
    }

    private TrainingAssignmentResponse toAssignmentResponse(TrainingAssignment assignment) {
        Employee employee = employeeRepository.findById(assignment.getEmployeeId()).orElse(null);
        ControlledDocument document = assignment.getDocumentId() == null ? null : documentRepository.findById(assignment.getDocumentId()).orElse(null);
        DocumentRevision revision = assignment.getRevisionId() == null ? null : revisionRepository.findById(assignment.getRevisionId()).orElse(null);
        return TrainingAssignmentResponse.builder()
                .id(assignment.getId())
                .assignmentCode(assignment.getAssignmentCode())
                .employeeId(assignment.getEmployeeId())
                .employeeCode(employee == null ? null : employee.getEmployeeCode())
                .employeeName(employee == null ? null : employee.getFullName())
                .employeeDepartment(employee == null ? null : employee.getDepartment())
                .employeeJobTitle(employee == null ? null : employee.getJobTitle())
                .assignedUsername(assignment.getAssignedUsername())
                .trainingTitle(assignment.getTrainingTitle())
                .trainingType(assignment.getTrainingType())
                .documentId(assignment.getDocumentId())
                .revisionId(assignment.getRevisionId())
                .documentNumber(document == null ? null : document.getDocumentNumber())
                .documentRevision(revision == null ? null : revision.getRevision())
                .requiredRole(assignment.getRequiredRole())
                .status(resolveStatus(assignment))
                .dueDate(assignment.getDueDate())
                .completedAt(assignment.getCompletedAt())
                .completedBy(assignment.getCompletedBy())
                .completionComments(assignment.getCompletionComments())
                .assignedBy(assignment.getAssignedBy())
                .assignedAt(assignment.getAssignedAt())
                .isActive(assignment.getIsActive())
                .build();
    }

    private RoleQualificationRequirementResponse toRequirementResponse(RoleQualificationRequirement requirement) {
        ControlledDocument document = requirement.getDocumentId() == null ? null : documentRepository.findById(requirement.getDocumentId()).orElse(null);
        DocumentRevision revision = requirement.getRevisionId() == null ? null : revisionRepository.findById(requirement.getRevisionId()).orElse(null);
        return RoleQualificationRequirementResponse.builder()
                .id(requirement.getId())
                .roleName(requirement.getRoleName())
                .trainingTitle(requirement.getTrainingTitle())
                .trainingType(requirement.getTrainingType())
                .documentId(requirement.getDocumentId())
                .revisionId(requirement.getRevisionId())
                .documentNumber(document == null ? null : document.getDocumentNumber())
                .documentRevision(revision == null ? null : revision.getRevision())
                .recurrenceMonths(requirement.getRecurrenceMonths())
                .isMandatory(requirement.getIsMandatory())
                .isActive(requirement.getIsActive())
                .createdBy(requirement.getCreatedBy())
                .createdAt(requirement.getCreatedAt())
                .updatedBy(requirement.getUpdatedBy())
                .updatedAt(requirement.getUpdatedAt())
                .build();
    }

    private TrainingAssignmentStatus resolveStatus(TrainingAssignment assignment) {
        if (assignment.getStatus() == TrainingAssignmentStatus.COMPLETED || assignment.getStatus() == TrainingAssignmentStatus.CANCELLED) {
            return assignment.getStatus();
        }
        return resolveStatus(assignment.getDueDate());
    }

    private TrainingAssignmentStatus resolveStatus(LocalDate dueDate) {
        if (dueDate != null && dueDate.isBefore(LocalDate.now())) {
            return TrainingAssignmentStatus.OVERDUE;
        }
        return TrainingAssignmentStatus.ASSIGNED;
    }

    private String trimRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessConflictException(message);
        }
        return value.trim();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
