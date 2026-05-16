package com.batchsphere.core.qms.batchrelease.dto;

import com.batchsphere.core.qms.batchrelease.entity.BatchReleaseStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class QpBatchReleaseDTO {

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CreateQpBatchReleaseRequest {
    @NotBlank
    private String lotNumber;
    @NotBlank
    private String productName;
    private UUID materialId;
    private UUID grnId;
    private BigDecimal batchSize;
    private String batchUom;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CertifyBatchRequest {
    private String qpName;
    private UUID qpEmployeeId;
    private String certificationStatement;
    private String meaning;
    private String reason;
    private String username;
    private String password;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class RejectBatchRequest {
    @NotBlank
    private String reason;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class AnalystSignCoaRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class IssueCoaRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    private String deliveryNote;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CoaResponse {
    private UUID id;
    private String releaseNumber;
    private String coaNumber;
    private String lotNumber;
    private String productName;
    private BigDecimal batchSize;
    private String batchUom;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private BatchReleaseStatus status;
    private String analystSignedBy;
    private LocalDateTime analystSignedAt;
    private String coaIssuedBy;
    private LocalDateTime coaIssuedAt;
    private Boolean coaLocked;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class QpBatchReleaseResponse {
    private UUID id;
    private String releaseNumber;
    private String lotNumber;
    private String productName;
    private UUID materialId;
    private UUID grnId;
    private BigDecimal batchSize;
    private String batchUom;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private BatchReleaseStatus status;
    private Boolean qcDispositionConfirmed;
    private Boolean oosInvestigationsClosed;
    private Boolean noOpenCriticalDeviations;
    private Boolean documentsComplete;
    private String qpName;
    private UUID qpEmployeeId;
    private String qpCertificationStatement;
    private LocalDateTime certifiedAt;
    private UUID certificationESignatureId;
    private String rejectionReason;
    private String onHoldReason;
    private String coaNumber;
    private LocalDateTime coaIssuedAt;
    private String coaIssuedBy;
    private Boolean coaLocked;
    private String analystSignedBy;
    private LocalDateTime analystSignedAt;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class BatchCertificateResponse {
    private UUID id;
    private String releaseNumber;
    private String lotNumber;
    private String productName;
    private UUID materialId;
    private UUID grnId;
    private BigDecimal batchSize;
    private String batchUom;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private BatchReleaseStatus status;
    private String qcDispositionSummary;
    private String investigationSummary;
    private String deviationSummary;
    private String documentSummary;
    private String qpName;
    private String certificationStatement;
    private LocalDateTime certifiedAt;
    private UUID eSignatureId;
  }
}
