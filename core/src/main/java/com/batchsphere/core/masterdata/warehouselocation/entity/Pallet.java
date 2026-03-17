package com.batchsphere.core.masterdata.warehouselocation.entity;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
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
@Table(name = "pallet")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pallet {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "shelf_id", nullable = false)
    private UUID shelfId;

    @Column(name = "pallet_code", nullable = false, unique = true, length = 50)
    private String palletCode;

    @Column(name = "pallet_name", nullable = false, length = 150)
    private String palletName;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_condition", nullable = false, length = 50)
    private StorageCondition storageCondition;

    @Column(length = 500)
    private String description;

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
