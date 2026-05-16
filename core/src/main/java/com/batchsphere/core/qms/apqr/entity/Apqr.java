package com.batchsphere.core.qms.apqr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "apqr")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Apqr {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "apqr_number", unique = true, nullable = false, length = 30)
  private String apqrNumber;

  @Column(name = "product_name", nullable = false, length = 255)
  private String productName;

  @Column(name = "material_id")
  private UUID materialId;

  @Column(name = "review_year", nullable = false)
  private Integer reviewYear;

  @Column(name = "period_start", nullable = false)
  private LocalDate periodStart;

  @Column(name = "period_end", nullable = false)
  private LocalDate periodEnd;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  @Builder.Default
  private ApqrStatus status = ApqrStatus.DRAFT;

  @Column(name = "total_batches_manufactured")
  @Builder.Default
  private Integer totalBatchesManufactured = 0;

  @Column(name = "total_grn_received")
  @Builder.Default
  private Integer totalGrnReceived = 0;

  @Column(name = "grn_rejection_count")
  @Builder.Default
  private Integer grnRejectionCount = 0;

  @Column(name = "oos_count")
  @Builder.Default
  private Integer oosCount = 0;

  @Column(name = "oot_count")
  @Builder.Default
  private Integer ootCount = 0;

  @Column(name = "deviation_count")
  @Builder.Default
  private Integer deviationCount = 0;

  @Column(name = "open_capa_count")
  @Builder.Default
  private Integer openCapaCount = 0;

  @Column(name = "change_control_count")
  @Builder.Default
  private Integer changeControlCount = 0;

  @Column(name = "complaint_count")
  @Builder.Default
  private Integer complaintCount = 0;

  @Column(name = "process_in_control")
  private Boolean processInControl;

  @Column(name = "trends_identified", columnDefinition = "TEXT")
  private String trendsIdentified;

  @Column(name = "recommendations", columnDefinition = "TEXT")
  private String recommendations;

  @Column(name = "prepared_by", length = 100)
  private String preparedBy;

  @Column(name = "prepared_at")
  private LocalDateTime preparedAt;

  @Column(name = "reviewed_by", length = 100)
  private String reviewedBy;

  @Column(name = "reviewed_at")
  private LocalDateTime reviewedAt;

  @Column(name = "approved_by", length = 100)
  private String approvedBy;

  @Column(name = "approved_at")
  private LocalDateTime approvedAt;

  @Column(name = "approval_e_signature_id")
  private UUID approvalESignatureId;

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
    if (createdAt == null) createdAt = LocalDateTime.now();
    if (apqrNumber == null) {
      apqrNumber = "APQR-" + reviewYear + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
  }

  public enum ApqrStatus {
    DRAFT, UNDER_REVIEW, APPROVED, CLOSED
  }
}