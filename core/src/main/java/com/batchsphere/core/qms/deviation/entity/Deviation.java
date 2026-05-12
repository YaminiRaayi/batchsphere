package com.batchsphere.core.qms.deviation.entity;

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
@Table(name = "qms_deviation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Deviation {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "deviation_number", nullable = false, unique = true, length = 100)
    private String deviationNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "deviation_type", nullable = false, length = 40)
    private DeviationType deviationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DeviationSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private DeviationStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_module", nullable = false, length = 40)
    private DeviationSourceModule sourceModule;

    @Column(name = "source_entity_id")
    private UUID sourceEntityId;

    @Column(name = "source_reference", length = 120)
    private String sourceReference;

    @Column(length = 100)
    private String department;

    @Column(name = "detected_by", nullable = false, length = 100)
    private String detectedBy;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    @Column(name = "immediate_action", columnDefinition = "TEXT")
    private String immediateAction;

    @Column(name = "investigation_summary", columnDefinition = "TEXT")
    private String investigationSummary;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "impact_assessment", columnDefinition = "TEXT")
    private String impactAssessment;

    @Column(name = "closure_summary", columnDefinition = "TEXT")
    private String closureSummary;

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
