package com.batchsphere.core.masterdata.vendorbusinessunit.entity;

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
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "vendor_business_unit")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorBusinessUnit {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "vendor_id", nullable = false)
    private UUID vendorId;

    @Column(name = "unit_name", nullable = false, length = 200)
    private String unitName;

    @Column(name = "bu_code", length = 100)
    private String buCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "site_type", length = 50)
    private SiteType siteType;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String country;

    @Column(length = 20)
    private String pincode;

    // ─── Site contact ──────────────────────────────────────────────────────────

    @Column(name = "site_contact_person", length = 255)
    private String siteContactPerson;

    @Column(name = "site_email", length = 255)
    private String siteEmail;

    @Column(name = "site_phone", length = 50)
    private String sitePhone;

    // ─── India regulatory ──────────────────────────────────────────────────────

    @Column(name = "drug_license_number", length = 100)
    private String drugLicenseNumber;

    @Column(name = "drug_license_expiry")
    private LocalDate drugLicenseExpiry;

    // ─── GMP Certification ─────────────────────────────────────────────────────

    @Column(name = "gmp_cert_body", length = 100)
    private String gmpCertBody;

    @Column(name = "gmp_cert_number", length = 100)
    private String gmpCertNumber;

    @Column(name = "gmp_cert_expiry")
    private LocalDate gmpCertExpiry;

    @Column(name = "is_who_gmp_certified", nullable = false)
    private Boolean isWhoGmpCertified;

    @Column(name = "is_usfda", nullable = false)
    private Boolean isUsfda;

    @Column(name = "is_eu_gmp", nullable = false)
    private Boolean isEuGmp;

    // ─── Qualification ─────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "qualification_status", nullable = false, length = 50)
    private QualificationStatus qualificationStatus;

    @Column(name = "qualified_date")
    private LocalDate qualifiedDate;

    @Column(name = "next_requalification_due")
    private LocalDate nextRequalificationDue;

    @Column(name = "last_audit_date")
    private LocalDate lastAuditDate;

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
