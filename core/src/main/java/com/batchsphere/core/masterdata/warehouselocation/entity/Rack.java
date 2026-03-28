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
@Table(name = "rack")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Rack {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "warehouse_id", nullable = false)
    private UUID warehouseId;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "rack_code", nullable = false, length = 50)
    private String rackCode;

    @Column(name = "rack_name", nullable = false, length = 150)
    private String rackName;

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
