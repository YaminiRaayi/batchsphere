package com.batchsphere.core.transcations.inventory.entity;

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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inventory {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "batch_id", nullable = false)
    private UUID batchId;

    @Column(name = "pallet_id", nullable = false)
    private UUID palletId;

    @Column(name = "quantity_on_hand", nullable = false, precision = 18, scale = 3)
    private BigDecimal quantityOnHand;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InventoryStatus status;

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
