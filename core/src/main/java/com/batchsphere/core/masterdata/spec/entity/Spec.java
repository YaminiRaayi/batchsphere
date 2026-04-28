package com.batchsphere.core.masterdata.spec.entity;

import com.batchsphere.core.masterdata.quality.enums.CompendialRef;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
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
@Table(name = "spec_master")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Spec {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "spec_code", nullable = false, unique = true, length = 100)
    private String specCode;

    @Column(name = "spec_name", nullable = false, length = 255)
    private String specName;

    @Column(name = "revision", length = 50)
    private String revision;

    @Enumerated(EnumType.STRING)
    @Column(name = "spec_type", nullable = false, length = 50)
    private SpecType specType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private SpecStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "sampling_method", nullable = false, length = 50)
    private SamplingMethod samplingMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_market", length = 50)
    private TargetMarket targetMarket;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "compendial_ref", length = 50)
    private CompendialRef compendialRef;

    @Column(name = "compendial_edition", length = 100)
    private String compendialEdition;

    @Column(name = "reference_document_no", length = 100)
    private String referenceDocumentNo;

    @Column(name = "reference_attachment", length = 500)
    private String referenceAttachment;

    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_remarks", columnDefinition = "TEXT")
    private String reviewRemarks;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_route", nullable = false, length = 50)
    private ReviewRoute reviewRoute;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "previous_spec_id")
    private UUID previousSpecId;

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
