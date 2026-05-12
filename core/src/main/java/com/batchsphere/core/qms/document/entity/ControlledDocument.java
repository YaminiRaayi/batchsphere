package com.batchsphere.core.qms.document.entity;

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
@Table(name = "controlled_document")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ControlledDocument {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "document_number", nullable = false, unique = true, length = 100)
    private String documentNumber;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private ControlledDocumentType documentType;

    @Column(length = 120)
    private String category;

    @Column(nullable = false, length = 120)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ControlledDocumentStatus status;

    @Column(name = "current_revision_id")
    private UUID currentRevisionId;

    @Column(name = "linked_material_code", length = 100)
    private String linkedMaterialCode;

    @Column(name = "linked_moa_code", length = 100)
    private String linkedMoaCode;

    @Column(name = "review_cycle_months", nullable = false)
    private Integer reviewCycleMonths;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

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
