package com.batchsphere.core.masterdata.supplier.sqa.dto;

import com.batchsphere.core.masterdata.supplier.sqa.entity.SupplierQualityAgreementStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class SupplierQualityAgreementDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private UUID supplierId;
        private UUID vendorBusinessUnitId;
        @NotBlank
        private String title;
        private LocalDate effectiveDate;
        private LocalDate expiryDate;
        private SupplierQualityAgreementStatus status;
        private UUID sopDocumentId;
        private String gmpResponsibilities;
        private String changeNotificationRequirements;
        private String auditRights;
        private String testingResponsibilities;
        private String retentionSampleRequirements;
        private String agreedAcceptanceCriteria;
        private String ourSignatory;
        private LocalDate ourSignatoryDate;
        private String supplierSignatory;
        private LocalDate supplierSignatoryDate;
        private String terminatedReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusRequest {
        private SupplierQualityAgreementStatus status;
        private String terminatedReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private String sqaNumber;
        private UUID supplierId;
        private String supplierName;
        private UUID vendorBusinessUnitId;
        private String vendorBusinessUnitName;
        private String title;
        private LocalDate effectiveDate;
        private LocalDate expiryDate;
        private SupplierQualityAgreementStatus status;
        private UUID sopDocumentId;
        private String gmpResponsibilities;
        private String changeNotificationRequirements;
        private String auditRights;
        private String testingResponsibilities;
        private String retentionSampleRequirements;
        private String agreedAcceptanceCriteria;
        private String ourSignatory;
        private LocalDate ourSignatoryDate;
        private String supplierSignatory;
        private LocalDate supplierSignatoryDate;
        private String terminatedReason;
        private Boolean expiringSoon;
        private Long daysUntilExpiry;
        private String createdBy;
        private LocalDateTime createdAt;
        private String updatedBy;
        private LocalDateTime updatedAt;
    }
}
