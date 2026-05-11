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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sampling_container_draw")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SamplingContainerDraw {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sampling_plan_id", nullable = false)
    private UUID samplingPlanId;

    @Column(name = "grn_container_id", nullable = false)
    private UUID grnContainerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "draw_purpose", nullable = false, length = 50)
    private SamplingDrawPurpose drawPurpose;

    @Column(name = "planned_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal plannedQuantity;

    @Column(name = "actual_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal actualQuantity;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Column(name = "balance_before", nullable = false, precision = 18, scale = 3)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 18, scale = 3)
    private BigDecimal balanceAfter;

    @Column(name = "sampled_by", nullable = false, length = 100)
    private String sampledBy;

    @Column(name = "sampled_at", nullable = false)
    private LocalDateTime sampledAt;

    @Column(name = "container_condition", length = 255)
    private String containerCondition;

    @Column(name = "resealed", nullable = false)
    private Boolean resealed;

    @Column(name = "label_applied", nullable = false)
    private Boolean labelApplied;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
