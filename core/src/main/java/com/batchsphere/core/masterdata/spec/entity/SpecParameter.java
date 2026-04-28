package com.batchsphere.core.masterdata.spec.entity;

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
@Table(name = "spec_parameter")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecParameter {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "spec_id", nullable = false)
    private UUID specId;

    @Column(name = "parameter_name", nullable = false, length = 255)
    private String parameterName;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false, length = 50)
    private SpecParameterTestType testType;

    @Column(name = "moa_id")
    private UUID moaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "criteria_type", nullable = false, length = 50)
    private SpecParameterCriteriaType criteriaType;

    @Column(name = "lower_limit", precision = 18, scale = 4)
    private BigDecimal lowerLimit;

    @Column(name = "upper_limit", precision = 18, scale = 4)
    private BigDecimal upperLimit;

    @Column(name = "text_criteria", length = 500)
    private String textCriteria;

    @Column(name = "compendial_chapter_ref", length = 200)
    private String compendialChapterRef;

    @Column(length = 50)
    private String unit;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory;

    @Column(nullable = false)
    private Integer sequence;

    @Column(columnDefinition = "TEXT")
    private String notes;

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
