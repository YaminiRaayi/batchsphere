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
@Table(name = "qc_sample")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sample {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sample_number", nullable = false, unique = true, length = 100)
    private String sampleNumber;

    @Column(name = "sampling_request_id", nullable = false, unique = true)
    private UUID samplingRequestId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sample_type", nullable = false, length = 30)
    private SampleType sampleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "sample_status", nullable = false, length = 30)
    private SampleStatus sampleStatus;

    @Column(name = "sample_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal sampleQuantity;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Column(name = "collected_by", nullable = false, length = 100)
    private String collectedBy;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;

    @Column(name = "sampling_location", nullable = false, length = 150)
    private String samplingLocation;

    @Column(name = "handoff_to_qc_by", length = 100)
    private String handoffToQcBy;

    @Column(name = "handoff_to_qc_at")
    private LocalDateTime handoffToQcAt;

    @Column(name = "received_by_qc", length = 100)
    private String receivedByQc;

    @Column(name = "received_at_qc")
    private LocalDateTime receivedAtQc;

    @Column(name = "receipt_condition", length = 255)
    private String receiptCondition;

    @Column(name = "qc_storage_location", length = 150)
    private String qcStorageLocation;

    @Column(length = 500)
    private String remarks;

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
