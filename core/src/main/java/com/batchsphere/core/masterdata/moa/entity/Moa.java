package com.batchsphere.core.masterdata.moa.entity;

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
@Table(name = "moa_master")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Moa {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "moa_code", nullable = false, unique = true, length = 100)
    private String moaCode;

    @Column(name = "moa_name", nullable = false, length = 255)
    private String moaName;

    @Column(name = "revision", length = 50)
    private String revision;

    @Column(name = "reference_attachment", length = 500)
    private String referenceAttachment;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
