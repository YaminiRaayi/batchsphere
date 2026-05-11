package com.batchsphere.core.masterdata.supplier.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "supplier")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Supplier {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String supplierCode;

    @Column(nullable = false)
    private String supplierName;

    private String contactPerson;

    private String email;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_type", nullable = false, length = 50)
    @Builder.Default
    private SupplierType supplierType = SupplierType.DISTRIBUTOR;

    @Enumerated(EnumType.STRING)
    @Column(name = "qualification_status", nullable = false, length = 50)
    @Builder.Default
    private SupplierQualificationStatus qualificationStatus = SupplierQualificationStatus.QUALIFIED;

    @Column(name = "country_of_manufacture", length = 100)
    private String countryOfManufacture;

    @Column(name = "gmpcert_number", length = 100)
    private String gmpcertNumber;

    @Column(name = "gmpcert_issuing_authority", length = 255)
    private String gmpcertIssuingAuthority;

    @Column(name = "gmpcert_expiry_date")
    private LocalDate gmpcertExpiryDate;

    @Column(name = "approved_since")
    private LocalDate approvedSince;

    @Column(name = "last_audit_date")
    private LocalDate lastAuditDate;

    @Column(name = "next_audit_due")
    private LocalDate nextAuditDue;

    @Column(name = "rejection_rate", precision = 5, scale = 2)
    private BigDecimal rejectionRate;

    @Column(name = "open_capa_count", nullable = false)
    @Builder.Default
    private Integer openCapaCount = 0;

    private Boolean isActive;

    private String createdBy;

    private LocalDateTime createdAt;

    private String updatedBy;

    private LocalDateTime updatedAt;
}
