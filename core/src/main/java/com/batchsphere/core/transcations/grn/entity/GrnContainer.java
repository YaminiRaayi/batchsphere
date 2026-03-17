package com.batchsphere.core.transcations.grn.entity;

import com.batchsphere.core.masterdata.material.entity.StorageCondition;
import com.batchsphere.core.transcations.inventory.entity.InventoryStatus;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "grn_container")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrnContainer {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "grn_id", nullable = false)
    private UUID grnId;

    @Column(name = "grn_item_id", nullable = false)
    private UUID grnItemId;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "pallet_id", nullable = false)
    private UUID palletId;

    @Column(name = "container_number", nullable = false, length = 100)
    private String containerNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "container_type", nullable = false, length = 30)
    private ContainerType containerType;

    @Column(name = "vendor_batch", nullable = false, length = 100)
    private String vendorBatch;

    @Column(name = "internal_lot", nullable = false, length = 100)
    private String internalLot;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal quantity;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Column(name = "manufacture_date")
    private LocalDate manufactureDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "retest_date")
    private LocalDate retestDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_condition", nullable = false, length = 50)
    private StorageCondition storageCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "inventory_status", nullable = false, length = 30)
    private InventoryStatus inventoryStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "label_status", nullable = false, length = 30)
    private LabelStatus labelStatus;

    @Column(name = "sampled", nullable = false)
    private Boolean sampled;

    @Column(name = "sampled_quantity", precision = 18, scale = 3)
    private BigDecimal sampledQuantity;

    @Column(name = "sampling_location", length = 150)
    private String samplingLocation;

    @Column(name = "sampled_by", length = 100)
    private String sampledBy;

    @Column(name = "sampled_at")
    private LocalDateTime sampledAt;

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
