package com.batchsphere.core.qms.apqr.dto;

import com.batchsphere.core.qms.apqr.entity.Apqr.ApqrStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class ApqrDTO {

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CreateApqrRequest {
    @NotBlank
    private String productName;
    private UUID materialId;
    @NotNull
    private Integer reviewYear;
    @NotNull
    private LocalDate periodStart;
    @NotNull
    private LocalDate periodEnd;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ApqrResponse {
    private UUID id;
    private String apqrNumber;
    private String productName;
    private UUID materialId;
    private Integer reviewYear;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private ApqrStatus status;
    private Integer totalBatchesManufactured;
    private Integer totalGrnReceived;
    private Integer grnRejectionCount;
    private Integer oosCount;
    private Integer ootCount;
    private Integer deviationCount;
    private Integer openCapaCount;
    private Integer changeControlCount;
    private Integer complaintCount;
    private Boolean processInControl;
    private String trendsIdentified;
    private String recommendations;
    private String preparedBy;
    private LocalDateTime preparedAt;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private UUID approvalESignatureId;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ApqrConclusionRequest {
    private Boolean processInControl;
    private String trendsIdentified;
    private String recommendations;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ApproveApqrRequest {
    private String meaning;
    private String reason;
    private String username;
    private String password;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ApqrSummaryItem {
    private UUID materialId;
    private String productName;
    private Integer reviewYear;
    private ApqrStatus status;
    private Integer totalBatches;
    private Integer oosCount;
    private Integer deviationCount;
    private Integer openCapaCount;
  }
}
