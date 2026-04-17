package com.batchsphere.core.masterdata.spec.entity;

import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
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
@Table(name = "spec_master")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Spec {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "spec_code", nullable = false, unique = true, length = 100)
    private String specCode;

    @Column(name = "spec_name", nullable = false, length = 255)
    private String specName;

    @Column(name = "revision", length = 50)
    private String revision;

    @Enumerated(EnumType.STRING)
    @Column(name = "sampling_method", nullable = false, length = 50)
    private SamplingMethod samplingMethod;

    @Column(name = "reference_attachment", length = 500)
    private String referenceAttachment;

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
