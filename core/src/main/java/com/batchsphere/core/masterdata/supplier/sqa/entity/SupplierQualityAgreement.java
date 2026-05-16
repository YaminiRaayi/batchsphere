package com.batchsphere.core.masterdata.supplier.sqa.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
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
@Table(name = "supplier_quality_agreement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierQualityAgreement {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "sqa_number", nullable = false, unique = true, length = 30)
    private String sqaNumber;

    @Column(name = "supplier_id")
    private UUID supplierId;

    @Column(name = "vendor_business_unit_id")
    private UUID vendorBusinessUnitId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SupplierQualityAgreementStatus status;

    @Column(name = "sop_document_id")
    private UUID sopDocumentId;

    @Column(name = "gmp_responsibilities", columnDefinition = "TEXT")
    private String gmpResponsibilities;

    @Column(name = "change_notification_requirements", columnDefinition = "TEXT")
    private String changeNotificationRequirements;

    @Column(name = "audit_rights", columnDefinition = "TEXT")
    private String auditRights;

    @Column(name = "testing_responsibilities", columnDefinition = "TEXT")
    private String testingResponsibilities;

    @Column(name = "retention_sample_requirements", columnDefinition = "TEXT")
    private String retentionSampleRequirements;

    @Column(name = "agreed_acceptance_criteria", columnDefinition = "TEXT")
    private String agreedAcceptanceCriteria;

    @Column(name = "our_signatory", length = 100)
    private String ourSignatory;

    @Column(name = "our_signatory_date")
    private LocalDate ourSignatoryDate;

    @Column(name = "supplier_signatory", length = 255)
    private String supplierSignatory;

    @Column(name = "supplier_signatory_date")
    private LocalDate supplierSignatoryDate;

    @Column(name = "terminated_reason", columnDefinition = "TEXT")
    private String terminatedReason;

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

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }
}
