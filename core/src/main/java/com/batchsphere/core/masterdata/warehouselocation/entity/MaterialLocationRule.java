package com.batchsphere.core.masterdata.warehouselocation.entity;

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
@Table(name = "material_location_rule")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialLocationRule {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "default_warehouse_id")
    private UUID defaultWarehouseId;

    @Column(name = "default_room_id")
    private UUID defaultRoomId;

    @Column(name = "default_rack_id")
    private UUID defaultRackId;

    @Column(name = "quarantine_warehouse_id")
    private UUID quarantineWarehouseId;

    @Column(name = "quarantine_room_id")
    private UUID quarantineRoomId;

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
