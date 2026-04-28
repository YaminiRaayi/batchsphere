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
@Table(name = "qc_disposition")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcDisposition {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sample_id", unique = true)
    private UUID sampleId;

    @Column(name = "sampling_request_id", nullable = false, unique = true)
    private UUID samplingRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private QcDispositionStatus status;

    @Column(name = "decision_remarks", length = 1000)
    private String decisionRemarks;

    @Column(name = "decision_by", length = 100)
    private String decisionBy;

    @Column(name = "decision_at")
    private LocalDateTime decisionAt;

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
