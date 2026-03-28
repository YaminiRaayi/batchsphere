package com.batchsphere.core.transcations.sampling.entity;

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
@Table(name = "sampling_plan")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SamplingPlan {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sampling_request_id", nullable = false, unique = true)
    private UUID samplingRequestId;

    @Column(name = "spec_id")
    private UUID specId;

    @Column(name = "moa_id")
    private UUID moaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sampling_method", nullable = false, length = 30)
    private SamplingMethod samplingMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "sample_type", nullable = false, length = 30)
    private SampleType sampleType;

    @Column(name = "total_containers", nullable = false)
    private Integer totalContainers;

    @Column(name = "containers_to_sample", nullable = false)
    private Integer containersToSample;

    @Column(name = "individual_sample_quantity", precision = 18, scale = 3)
    private BigDecimal individualSampleQuantity;

    @Column(name = "composite_sample_quantity", precision = 18, scale = 3)
    private BigDecimal compositeSampleQuantity;

    @Column(name = "sampling_location", nullable = false, length = 150)
    private String samplingLocation;

    @Column(name = "analyst_employee_code", length = 100)
    private String analystEmployeeCode;

    @Column(name = "sampling_tool_id")
    private UUID samplingToolId;

    @Column(name = "photosensitive_handling_required", nullable = false)
    private Boolean photosensitiveHandlingRequired;

    @Column(name = "hygroscopic_handling_required", nullable = false)
    private Boolean hygroscopicHandlingRequired;

    @Column(name = "coa_based_release", nullable = false)
    private Boolean coaBasedRelease;

    @Column(length = 1000)
    private String rationale;

    @Column(name = "sampling_label_applied", nullable = false)
    private Boolean samplingLabelApplied;

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
