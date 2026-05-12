package com.batchsphere.core.transactions.grn.dto;

import com.batchsphere.core.transactions.grn.entity.CoaReviewStatus;
import com.batchsphere.core.transactions.grn.entity.GrnStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class GrnResponse {
    UUID id;
    String grnNumber;
    UUID supplierId;
    UUID vendorId;
    UUID vendorBusinessUnitId;
    LocalDate receiptDate;
    String invoiceNumber;
    String remarks;
    CoaReviewStatus coaReviewStatus;
    String coaReviewedBy;
    LocalDateTime coaReviewedAt;
    String coaReviewRemarks;
    BigDecimal temperatureOnArrival;
    Boolean coldChainCompliant;
    String containerCondition;
    String labelVerificationStatus;
    String quantityVarianceReason;
    GrnStatus status;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    List<GrnItemResponse> items;
}
