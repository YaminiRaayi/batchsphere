package com.batchsphere.core.lims.reagent.entity;

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
@Table(name = "lab_reference_standard")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabReferenceStandard {
    @Id
    private UUID id;

    @Column(name = "standard_code", nullable = false, unique = true, length = 50)
    private String standardCode;

    @Column(name = "standard_name", nullable = false)
    private String standardName;

    @Column(length = 50)
    private String pharmacopeia;

    @Column(name = "storage_condition", length = 100)
    private String storageCondition;

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
