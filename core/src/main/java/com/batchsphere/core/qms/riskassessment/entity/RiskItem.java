package com.batchsphere.core.qms.riskassessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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
@Table(name = "risk_item")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskItem {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "risk_assessment_id", nullable = false)
    private UUID riskAssessmentId;

    @Column(name = "sequence_number", nullable = false)
    private int sequenceNumber;

    @Column(name = "process_step", length = 255)
    private String processStep;

    @Column(name = "failure_mode", nullable = false, columnDefinition = "TEXT")
    private String failureMode;

    @Column(name = "failure_effect", nullable = false, columnDefinition = "TEXT")
    private String failureEffect;

    @Column(name = "failure_cause", nullable = false, columnDefinition = "TEXT")
    private String failureCause;

    @Column(name = "current_controls", columnDefinition = "TEXT")
    private String currentControls;

    @Column(nullable = false)
    private int probability;

    @Column(nullable = false)
    private int severity;

    @Column(nullable = false)
    private int detectability;

    @Column(nullable = false)
    private int rpn;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_control_type", length = 30)
    private RiskControlType riskControlType;

    @Column(name = "proposed_action", columnDefinition = "TEXT")
    private String proposedAction;

    @Column(name = "action_owner", length = 100)
    private String actionOwner;

    @Column(name = "action_due_date")
    private LocalDate actionDueDate;

    @Column(name = "linked_capa_id")
    private UUID linkedCapaId;

    @Column(name = "residual_probability")
    private Integer residualProbability;

    @Column(name = "residual_severity")
    private Integer residualSeverity;

    @Column(name = "residual_detectability")
    private Integer residualDetectability;

    @Column(name = "residual_rpn", nullable = false)
    private int residualRpn;

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

    @PrePersist
    @PreUpdate
    void calculateRpnValues() {
        rpn = probability * severity * detectability;
        residualRpn = (residualProbability != null ? residualProbability : probability)
                * (residualSeverity != null ? residualSeverity : severity)
                * (residualDetectability != null ? residualDetectability : detectability);
    }
}
