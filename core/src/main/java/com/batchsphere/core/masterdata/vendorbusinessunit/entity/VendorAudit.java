package com.batchsphere.core.masterdata.vendorbusinessunit.entity;

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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vendor_audit")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorAudit {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "bu_id", nullable = false)
    private UUID buId;

    @Enumerated(EnumType.STRING)
    @Column(name = "audit_type", nullable = false, length = 50)
    private VendorAuditType auditType;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "audited_by", nullable = false, length = 255)
    private String auditedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VendorAuditStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 50)
    private VendorAuditOutcome outcome;

    @Column(name = "observation_count")
    private Integer observationCount;

    @Column(name = "critical_observation_count")
    private Integer criticalObservationCount;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
