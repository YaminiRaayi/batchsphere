package com.batchsphere.core.transactions.sampling.entity;

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
@Table(name = "qc_sample_container_link")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SampleContainerLink {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sample_id", nullable = false)
    private UUID sampleId;

    @Column(name = "grn_container_id", nullable = false)
    private UUID grnContainerId;

    @Column(name = "container_number", nullable = false, length = 100)
    private String containerNumber;

    @Column(name = "sampled_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal sampledQuantity;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
