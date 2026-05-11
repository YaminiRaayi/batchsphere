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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qc_worksheet")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcWorksheet {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sampling_request_id", nullable = false)
    private UUID samplingRequestId;

    @Column(name = "sample_id", nullable = false)
    private UUID sampleId;

    @Column(name = "spec_id", nullable = false)
    private UUID specId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private QcWorksheetStatus status;

    @Column(name = "assigned_analyst", nullable = false, length = 100)
    private String assignedAnalyst;

    @Column(name = "reviewer", length = 100)
    private String reviewer;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "generated_by", nullable = false, length = 100)
    private String generatedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

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
