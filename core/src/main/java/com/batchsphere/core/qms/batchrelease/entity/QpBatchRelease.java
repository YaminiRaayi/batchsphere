package com.batchsphere.core.qms.batchrelease.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qp_batch_release")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QpBatchRelease {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "release_number", unique = true, nullable = false, length = 30)
  private String releaseNumber;

  @Column(name = "lot_number", nullable = false, length = 100)
  private String lotNumber;

  @Column(name = "product_name", nullable = false, length = 255)
  private String productName;

  @Column(name = "material_id")
  private UUID materialId;

  @Column(name = "grn_id")
  private UUID grnId;

  @Column(name = "batch_size", precision = 14, scale = 4)
  private BigDecimal batchSize;

  @Column(name = "batch_uom", length = 20)
  private String batchUom;

  @Column(name = "manufacture_date")
  private LocalDate manufactureDate;

  @Column(name = "expiry_date")
  private LocalDate expiryDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 30)
  @Builder.Default
  private BatchReleaseStatus status = BatchReleaseStatus.PENDING_QP_REVIEW;

  @Column(name = "qc_disposition_confirmed")
  @Builder.Default
  private Boolean qcDispositionConfirmed = false;

  @Column(name = "oos_investigations_closed")
  @Builder.Default
  private Boolean oosInvestigationsClosed = false;

  @Column(name = "no_open_critical_deviations")
  @Builder.Default
  private Boolean noOpenCriticalDeviations = false;

  @Column(name = "documents_complete")
  @Builder.Default
  private Boolean documentsComplete = false;

  @Column(name = "qp_name", length = 255)
  private String qpName;

  @Column(name = "qp_employee_id")
  private UUID qpEmployeeId;

  @Column(name = "qp_certification_statement", columnDefinition = "TEXT")
  private String qpCertificationStatement;

  @Column(name = "certified_at")
  private LocalDateTime certifiedAt;

  @Column(name = "certification_e_signature_id")
  private UUID certificationESignatureId;

  @Column(name = "coa_number", length = 30)
  private String coaNumber;

  @Column(name = "coa_issued_at")
  private LocalDateTime coaIssuedAt;

  @Column(name = "coa_issued_by", length = 100)
  private String coaIssuedBy;

  @Column(name = "coa_locked", nullable = false)
  @Builder.Default
  private Boolean coaLocked = false;

  @Column(name = "analyst_signed_by", length = 100)
  private String analystSignedBy;

  @Column(name = "analyst_signed_at")
  private LocalDateTime analystSignedAt;

  @Column(name = "rejection_reason", columnDefinition = "TEXT")
  private String rejectionReason;

  @Column(name = "on_hold_reason", columnDefinition = "TEXT")
  private String onHoldReason;

  @Column(name = "is_active", nullable = false)
  @Builder.Default
  private Boolean isActive = true;

  @Column(name = "created_by", nullable = false, length = 100)
  private String createdBy;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_by", length = 100)
  private String updatedBy;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    if (createdAt == null) {
      createdAt = LocalDateTime.now();
    }
    if (releaseNumber == null) {
      releaseNumber = "QBR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
  }
}
