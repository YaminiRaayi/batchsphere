package com.batchsphere.core.lims.reagent.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "lab_reagent_lot")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabReagentLot {
    @Id
    private UUID id;

    @Column(name = "reagent_id", nullable = false)
    private UUID reagentId;

    @Column(name = "lot_number", nullable = false, length = 100)
    private String lotNumber;

    @Column(length = 255)
    private String supplier;

    @Column(name = "received_date")
    private LocalDate receivedDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Builder.Default
    @Column(name = "quantity_received", nullable = false, precision = 18, scale = 6)
    private BigDecimal quantityReceived = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "quantity_used", nullable = false, precision = 18, scale = 6)
    private BigDecimal quantityUsed = BigDecimal.ZERO;

    @Column(length = 50)
    private String unit;

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Builder.Default
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
