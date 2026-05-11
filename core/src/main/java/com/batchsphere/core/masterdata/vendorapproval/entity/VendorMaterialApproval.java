package com.batchsphere.core.masterdata.vendorapproval.entity;

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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vendor_material_approval")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorMaterialApproval {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Column(name = "vendor_business_unit_id", nullable = false)
    private UUID vendorBusinessUnitId;

    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private VendorMaterialApprovalStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_basis", nullable = false, length = 50)
    private VendorMaterialApprovalBasis approvalBasis;

    @Column(name = "qualification_date")
    private LocalDate qualificationDate;

    @Column(name = "next_requalification_date")
    private LocalDate nextRequalificationDate;

    @Column(name = "approved_by", nullable = false, length = 100)
    private String approvedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

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
