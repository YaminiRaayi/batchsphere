package com.batchsphere.core.masterdata.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "material")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class Material {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "material_code", nullable = false, unique = true, length = 50)
    private String materialCode;

    @Column(name = "material_name", nullable = false, length = 255)
    private String materialName;

    @Column(name = "material_type", nullable = false, length = 50)
    private String materialType;

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
