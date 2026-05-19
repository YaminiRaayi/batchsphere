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
@Table(name = "em_monitoring_point")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmMonitoringPoint {
    @Id
    private UUID id;

    @Column(name = "point_code", nullable = false, unique = true, length = 50)
    private String pointCode;

    @Column(name = "point_name", nullable = false)
    private String pointName;

    @Column(name = "monitoring_type", nullable = false, length = 50)
    private String monitoringType;

    @Column(name = "room_id")
    private UUID roomId;

    @Column(name = "location_description")
    private String locationDescription;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(name = "alert_limit", nullable = false, precision = 18, scale = 6)
    private BigDecimal alertLimit;

    @Column(name = "action_limit", nullable = false, precision = 18, scale = 6)
    private BigDecimal actionLimit;

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
