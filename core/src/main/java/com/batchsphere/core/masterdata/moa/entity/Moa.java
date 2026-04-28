package com.batchsphere.core.masterdata.moa.entity;

import com.batchsphere.core.masterdata.quality.enums.CompendialRef;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "moa_master")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Moa {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "moa_code", nullable = false, unique = true, length = 100)
    private String moaCode;

    @Column(name = "moa_name", nullable = false, length = 255)
    private String moaName;

    @Column(name = "revision", length = 50)
    private String revision;

    @Enumerated(EnumType.STRING)
    @Column(name = "moa_type", length = 50)
    private MoaType moaType;

    @Column(name = "principle", columnDefinition = "TEXT")
    private String principle;

    @Enumerated(EnumType.STRING)
    @Column(name = "compendial_ref", length = 50)
    private CompendialRef compendialRef;

    @Column(name = "instrument_type", length = 200)
    private String instrumentType;

    @Column(name = "reagents_and_standards", columnDefinition = "TEXT")
    private String reagentsAndStandards;

    @Column(name = "system_suitability_criteria", columnDefinition = "TEXT")
    private String systemSuitabilityCriteria;

    @Column(name = "calculation_formula", columnDefinition = "TEXT")
    private String calculationFormula;

    @Column(name = "reportable_range", length = 100)
    private String reportableRange;

    @Column(name = "reference_attachment", length = 500)
    private String referenceAttachment;

    @Column(name = "validation_reference_no", length = 100)
    private String validationReferenceNo;

    @Column(name = "validation_attachment", length = 500)
    private String validationAttachment;

    @Column(name = "sample_solution_stability_value", precision = 18, scale = 2)
    private BigDecimal sampleSolutionStabilityValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "sample_solution_stability_unit", length = 20)
    private SampleSolutionStabilityUnit sampleSolutionStabilityUnit;

    @Column(name = "sample_solution_stability_condition", length = 200)
    private String sampleSolutionStabilityCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 50)
    private MoaValidationStatus validationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private MoaStatus status;

    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_remarks", columnDefinition = "TEXT")
    private String reviewRemarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_route", nullable = false, length = 50)
    private ReviewRoute reviewRoute;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

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
