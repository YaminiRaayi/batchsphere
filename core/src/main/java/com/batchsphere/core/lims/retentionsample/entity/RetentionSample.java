package com.batchsphere.core.lims.retentionsample.entity;

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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "retention_sample")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetentionSample {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sampling_request_id", nullable = false)
    private UUID samplingRequestId;

    @Column(name = "lot_number", nullable = false, length = 100)
    private String lotNumber;

    @Column(name = "material_id")
    private UUID materialId;

    @Column(name = "material_name", length = 255)
    private String materialName;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal quantity;

    @Column(nullable = false, length = 20)
    private String uom;

    @Column(name = "container_description", length = 255)
    private String containerDescription;

    @Column(name = "storage_location", nullable = false, length = 255)
    private String storageLocation;

    @Column(name = "storage_condition", length = 100)
    private String storageCondition;

    @Column(name = "retention_until", nullable = false)
    private LocalDate retentionUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RetentionSampleStatus status;

    @Column(name = "received_by", nullable = false, length = 100)
    private String receivedBy;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "retrieval_reason", columnDefinition = "TEXT")
    private String retrievalReason;

    @Column(name = "retrieved_by", length = 100)
    private String retrievedBy;

    @Column(name = "retrieved_at")
    private OffsetDateTime retrievedAt;

    @Column(name = "test_result_reference", length = 255)
    private String testResultReference;

    @Column(name = "disposal_reason", columnDefinition = "TEXT")
    private String disposalReason;

    @Column(name = "disposed_by", length = 100)
    private String disposedBy;

    @Column(name = "disposed_at")
    private OffsetDateTime disposedAt;

    @Column(name = "disposal_method", length = 100)
    private String disposalMethod;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
