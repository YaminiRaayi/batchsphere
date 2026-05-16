package com.batchsphere.core.transactions.grn.entity;

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
@Table(name = "grn")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Grn {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "grn_number", nullable = false, unique = true, length = 100)
    private String grnNumber;

    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Column(name = "vendor_business_unit_id", nullable = false)
    private UUID vendorBusinessUnitId;

    @Column(name = "receipt_date", nullable = false)
    private LocalDate receiptDate;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "coa_review_status", nullable = false, length = 30)
    @Builder.Default
    private CoaReviewStatus coaReviewStatus = CoaReviewStatus.PENDING;

    @Column(name = "coa_reviewed_by", length = 100)
    private String coaReviewedBy;

    @Column(name = "coa_reviewed_at")
    private LocalDateTime coaReviewedAt;

    @Column(name = "coa_review_remarks", columnDefinition = "TEXT")
    private String coaReviewRemarks;

    @Column(name = "temperature_on_arrival", precision = 8, scale = 2)
    private BigDecimal temperatureOnArrival;

    @Column(name = "cold_chain_compliant")
    private Boolean coldChainCompliant;

    @Column(name = "container_condition", length = 100)
    private String containerCondition;

    @Column(name = "label_verification_status", length = 100)
    private String labelVerificationStatus;

    @Column(name = "quantity_variance_reason", columnDefinition = "TEXT")
    private String quantityVarianceReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private GrnStatus status;

    @Column(name = "linked_deviation_id")
    private UUID linkedDeviationId;

    @Column(name = "linked_deviation_number", length = 100)
    private String linkedDeviationNumber;

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
