package com.batchsphere.core.qms.riskassessment.entity;

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
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "risk_assessment")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAssessment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "assessment_number", nullable = false, unique = true, length = 30)
    private String assessmentNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RiskAssessmentScope scope;

    @Column(name = "scope_entity_type", length = 50)
    private String scopeEntityType;

    @Column(name = "scope_entity_id")
    private UUID scopeEntityId;

    @Column(name = "scope_entity_display", length = 255)
    private String scopeEntityDisplay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RiskAssessmentStatus status;

    @Column(length = 50)
    private String methodology;

    @Column(name = "prepared_by", nullable = false, length = 100)
    private String preparedBy;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "accepted_by", length = 100)
    private String acceptedBy;

    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;

    @Column(name = "acceptance_e_signature_id")
    private UUID acceptanceESignatureId;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "residual_risk_acceptable")
    private Boolean residualRiskAcceptable;

    @Column(name = "overall_risk_conclusion", columnDefinition = "TEXT")
    private String overallRiskConclusion;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
