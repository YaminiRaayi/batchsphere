package com.batchsphere.core.lims.stability.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stability_study")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StabilityStudy {
    @Id
    private UUID id;

    @Column(name = "study_number", nullable = false, unique = true, length = 50)
    private String studyNumber;

    @Column(name = "material_id")
    private UUID materialId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "batch_number", length = 100)
    private String batchNumber;

    @Column(name = "condition_label", nullable = false, length = 100)
    private String conditionLabel;

    @Column(name = "storage_condition", length = 100)
    private String storageCondition;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Builder.Default
    @Column(name = "oot_threshold_pct", nullable = false, precision = 10, scale = 4)
    private BigDecimal ootThresholdPct = BigDecimal.TEN;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
