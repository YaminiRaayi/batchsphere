package com.batchsphere.core.lims.em.entity;

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
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "em_result")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmResult {
    @Id
    private UUID id;

    @Column(name = "point_id", nullable = false)
    private UUID pointId;

    @Column(name = "result_value", nullable = false, precision = 18, scale = 6)
    private BigDecimal resultValue;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "recorded_by", nullable = false, length = 100)
    private String recordedBy;

    @Builder.Default
    @Column(name = "alert_breached", nullable = false)
    private Boolean alertBreached = false;

    @Builder.Default
    @Column(name = "action_breached", nullable = false)
    private Boolean actionBreached = false;

    @Column(name = "linked_deviation_id")
    private UUID linkedDeviationId;

    @Builder.Default
    @Column(name = "breach_dismissed", nullable = false)
    private Boolean breachDismissed = false;

    @Column(length = 500)
    private String notes;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
