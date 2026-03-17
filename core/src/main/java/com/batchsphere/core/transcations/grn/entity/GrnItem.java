package com.batchsphere.core.transcations.grn.entity;

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
@Table(name = "grn_item")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrnItem {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "grn_id", nullable = false)
    private UUID grnId;

    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "received_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal receivedQuantity;

    @Column(name = "accepted_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal acceptedQuantity;

    @Column(name = "rejected_quantity", nullable = false, precision = 18, scale = 3)
    private BigDecimal rejectedQuantity;

    @Column(name = "uom", nullable = false, length = 50)
    private String uom;

    @Column(name = "pallet_id", nullable = false)
    private UUID palletId;

    @Enumerated(EnumType.STRING)
    @Column(name = "container_type", nullable = false, length = 30)
    private ContainerType containerType;

    @Column(name = "number_of_containers", nullable = false)
    private Integer numberOfContainers;

    @Column(name = "quantity_per_container", nullable = false, precision = 18, scale = 3)
    private BigDecimal quantityPerContainer;

    @Column(name = "vendor_batch", nullable = false, length = 100)
    private String vendorBatch;

    @Column(name = "manufacture_date")
    private LocalDate manufactureDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "retest_date")
    private LocalDate retestDate;

    @Column(name = "unit_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "qc_status", nullable = false, length = 30)
    private QcStatus qcStatus;

    @Column(name = "description", length = 500)
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
