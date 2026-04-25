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
@Table(name = "warehouse_zone_rule")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseZoneRule {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "zone_name", nullable = false, length = 100)
    private String zoneName;

    @Column(name = "allowed_material_type", length = 50)
    private String allowedMaterialType;

    @Enumerated(EnumType.STRING)
    @Column(name = "allowed_storage_condition", length = 50)
    private StorageCondition allowedStorageCondition;

    @Column(name = "restricted_access", nullable = false)
    private Boolean restrictedAccess;

    @Column(name = "quarantine_only", nullable = false)
    private Boolean quarantineOnly;

    @Column(name = "rejected_only", nullable = false)
    private Boolean rejectedOnly;

    @Column(length = 500)
    private String notes;

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
