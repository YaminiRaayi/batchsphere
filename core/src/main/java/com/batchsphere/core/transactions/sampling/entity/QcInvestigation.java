package com.batchsphere.core.transactions.sampling.entity;

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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qc_investigation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcInvestigation {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "qc_disposition_id", nullable = false)
    private UUID qcDispositionId;

    @Column(name = "sampling_request_id", nullable = false)
    private UUID samplingRequestId;

    @Column(name = "sample_id", nullable = false)
    private UUID sampleId;

    @Column(name = "qc_test_result_id", nullable = false)
    private UUID qcTestResultId;

    @Column(name = "investigation_number", nullable = false, unique = true, length = 100)
    private String investigationNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private QcInvestigationStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "investigation_type", nullable = false, length = 30)
    private QcInvestigationType investigationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false, length = 30)
    private QcInvestigationPhase phase;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 30)
    private QcInvestigationOutcome outcome;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Column(name = "initial_assessment", length = 2000)
    private String initialAssessment;

    @Column(name = "phase_one_summary", length = 2000)
    private String phaseOneSummary;

    @Column(name = "phase_two_assessment", length = 2000)
    private String phaseTwoAssessment;

    @Column(name = "phase_two_summary", length = 2000)
    private String phaseTwoSummary;

    @Column(name = "phase_two_escalated_by", length = 100)
    private String phaseTwoEscalatedBy;

    @Column(name = "phase_two_escalated_at")
    private LocalDateTime phaseTwoEscalatedAt;

    @Column(name = "root_cause", length = 2000)
    private String rootCause;

    @Column(name = "resolution_remarks", length = 2000)
    private String resolutionRemarks;

    @Column(name = "capa_required", nullable = false)
    private Boolean capaRequired;

    @Column(name = "capa_reference", length = 150)
    private String capaReference;

    @Column(name = "outcome_submitted_by", length = 100)
    private String outcomeSubmittedBy;

    @Column(name = "outcome_submitted_at")
    private LocalDateTime outcomeSubmittedAt;

    @Column(name = "opened_by", nullable = false, length = 100)
    private String openedBy;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "qa_review_remarks", length = 2000)
    private String qaReviewRemarks;

    @Column(name = "qa_reviewed_by", length = 100)
    private String qaReviewedBy;

    @Column(name = "qa_reviewed_at")
    private LocalDateTime qaReviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "qa_review_decision", length = 30)
    private QcInvestigationQaReviewDecision qaReviewDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "closure_category", length = 50)
    private QcInvestigationClosureCategory closureCategory;

    @Column(name = "returned_to_qc_by", length = 100)
    private String returnedToQcBy;

    @Column(name = "returned_to_qc_at")
    private LocalDateTime returnedToQcAt;

    @Column(name = "returned_to_qc_remarks", length = 2000)
    private String returnedToQcRemarks;

    @Column(name = "qa_review_confirmed_by", length = 100)
    private String qaReviewConfirmedBy;

    @Column(name = "qa_review_confirmation_text", length = 120)
    private String qaReviewConfirmationText;

    @Column(name = "qa_review_confirmation_at")
    private LocalDateTime qaReviewConfirmationAt;

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
