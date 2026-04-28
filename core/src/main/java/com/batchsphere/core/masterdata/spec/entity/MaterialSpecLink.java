package com.batchsphere.core.masterdata.spec.entity;

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
@Table(name = "material_spec_link")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialSpecLink {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "spec_id", nullable = false)
    private UUID specId;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "linked_by", nullable = false, length = 100)
    private String linkedBy;

    @Column(name = "linked_at", nullable = false)
    private LocalDateTime linkedAt;

    @Column(name = "delinked_by", length = 100)
    private String delinkedBy;

    @Column(name = "delinked_at")
    private LocalDateTime delinkedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
