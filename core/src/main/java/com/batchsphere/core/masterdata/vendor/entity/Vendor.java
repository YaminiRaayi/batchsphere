package com.batchsphere.core.masterdata.vendor.entity;

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
@Table(name = "vendor")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vendor {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "vendor_code", nullable = false, unique = true, length = 100)
    private String vendorCode;

    @Column(name = "vendor_name", nullable = false, length = 200)
    private String vendorName;

    @Column(name = "contact_person", length = 255)
    private String contactPerson;

    @Column(length = 255)
    private String email;

    @Column(length = 50)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "vendor_category", length = 50)
    private VendorCategory vendorCategory;

    @Column(name = "corporate_address", columnDefinition = "TEXT")
    private String corporateAddress;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String country;

    @Column(length = 20)
    private String pincode;

    @Column(length = 15)
    private String gstin;

    @Column(length = 10)
    private String pan;

    @Column(length = 255)
    private String website;

    @Column(name = "payment_terms_days")
    private Integer paymentTermsDays;

    @Column(name = "approved_since")
    private LocalDate approvedSince;

    @Column(name = "last_audit_date")
    private LocalDate lastAuditDate;

    @Column(name = "next_audit_due")
    private LocalDate nextAuditDue;

    @Column(name = "qa_rating", precision = 3, scale = 1)
    private BigDecimal qaRating;

    @Column(name = "delivery_score", precision = 5, scale = 2)
    private BigDecimal deliveryScore;

    @Column(name = "rejection_rate", precision = 5, scale = 2)
    private BigDecimal rejectionRate;

    @Column(name = "open_capa_count")
    private Integer openCapaCount;

    @Column(name = "is_approved", nullable = false)
    private Boolean isApproved;

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
