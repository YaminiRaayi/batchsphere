package com.batchsphere.core.hrms.training.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "training_assignment")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingAssignment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "assignment_code", nullable = false, unique = true, length = 80)
    private String assignmentCode;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "assigned_username", nullable = false, length = 100)
    private String assignedUsername;

    @Column(name = "training_title", nullable = false, length = 255)
    private String trainingTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "training_type", nullable = false, length = 40)
    private TrainingType trainingType;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "revision_id")
    private UUID revisionId;

    @Column(name = "required_role", length = 80)
    private String requiredRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TrainingAssignmentStatus status;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completed_by", length = 100)
    private String completedBy;

    @Column(name = "completion_comments", columnDefinition = "TEXT")
    private String completionComments;

    @Column(name = "assigned_by", nullable = false, length = 100)
    private String assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
