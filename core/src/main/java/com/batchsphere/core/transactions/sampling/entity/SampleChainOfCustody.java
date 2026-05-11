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
@Table(name = "sample_chain_of_custody")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SampleChainOfCustody {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sample_id", nullable = false)
    private UUID sampleId;

    @Column(name = "sampling_request_id", nullable = false)
    private UUID samplingRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private SampleCustodyEventType eventType;

    @Column(name = "from_location", length = 150)
    private String fromLocation;

    @Column(name = "to_location", length = 150)
    private String toLocation;

    @Column(name = "handed_over_by", nullable = false, length = 100)
    private String handedOverBy;

    @Column(name = "handed_over_at", nullable = false)
    private LocalDateTime handedOverAt;

    @Column(name = "received_by", length = 100)
    private String receivedBy;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "receipt_condition", length = 255)
    private String receiptCondition;

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
