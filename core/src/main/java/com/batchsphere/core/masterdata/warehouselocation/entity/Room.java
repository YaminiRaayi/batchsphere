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
@Table(name = "room")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "warehouse_id", nullable = false)
    private UUID warehouseId;

    @Column(name = "room_code", nullable = false, length = 50)
    private String roomCode;

    @Column(name = "room_name", nullable = false, length = 150)
    private String roomName;

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
