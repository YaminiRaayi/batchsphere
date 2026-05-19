package com.batchsphere.core.lims.logbook.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "instrument_usage_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstrumentUsageLog {
    @Id
    private UUID id;

    @Column(name = "equipment_id", nullable = false)
    private UUID equipmentId;

    @Column(name = "used_by", nullable = false, length = 100)
    private String usedBy;

    @Column(name = "used_at", nullable = false)
    private LocalDateTime usedAt;

    @Column(length = 200)
    private String purpose;

    @Column(name = "sampling_request_id")
    private UUID samplingRequestId;

    @Builder.Default
    @Column(name = "condition_at_use", nullable = false, length = 30)
    private String conditionAtUse = "NORMAL";

    @Column(name = "anomaly_description", columnDefinition = "TEXT")
    private String anomalyDescription;

    @Column(name = "linked_deviation_id")
    private UUID linkedDeviationId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
