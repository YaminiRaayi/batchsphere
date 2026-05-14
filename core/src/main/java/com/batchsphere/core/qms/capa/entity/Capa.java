package com.batchsphere.core.qms.capa.entity;

import com.batchsphere.core.qms.deviation.entity.DeviationSeverity;
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
@Table(name = "qms_capa")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Capa {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "capa_number", nullable = false, unique = true, length = 100)
    private String capaNumber;

    @Column(name = "deviation_id", nullable = false)
    private UUID deviationId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DeviationSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CapaStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 30)
    private CapaApprovalStatus approvalStatus;

    @Column(name = "submitted_for_approval_by", length = 100)
    private String submittedForApprovalBy;

    @Column(name = "submitted_for_approval_at")
    private LocalDateTime submittedForApprovalAt;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_comments", columnDefinition = "TEXT")
    private String approvalComments;

    @Column(name = "approval_esignature_id")
    private UUID approvalESignatureId;

    @Column(nullable = false, length = 100)
    private String owner;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "corrective_action", nullable = false, columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(name = "preventive_action", columnDefinition = "TEXT")
    private String preventiveAction;

    @Column(name = "effectiveness_check", columnDefinition = "TEXT")
    private String effectivenessCheck;

    @Column(name = "effectiveness_review_date")
    private LocalDate effectivenessReviewDate;

    @Column(name = "effectiveness_reviewer", length = 100)
    private String effectivenessReviewer;

    @Enumerated(EnumType.STRING)
    @Column(name = "effectiveness_outcome", nullable = false, length = 20)
    private CapaEffectivenessOutcome effectivenessOutcome;

    @Column(name = "effectiveness_outcome_comments", columnDefinition = "TEXT")
    private String effectivenessOutcomeComments;

    @Column(name = "effectiveness_review_at")
    private LocalDateTime effectivenessReviewAt;

    @Column(name = "effectiveness_review_by", length = 100)
    private String effectivenessReviewBy;

    @Column(name = "effectiveness_esignature_id")
    private UUID effectivenessESignatureId;

    @Column(name = "completion_summary", columnDefinition = "TEXT")
    private String completionSummary;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closure_esignature_id")
    private UUID closureESignatureId;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
