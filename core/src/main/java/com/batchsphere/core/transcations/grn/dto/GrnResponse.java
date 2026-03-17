package com.batchsphere.core.transcations.grn.dto;

import com.batchsphere.core.transcations.grn.entity.GrnStatus;
import lombok.Builder;
import lombok.Value;

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
    GrnStatus status;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    List<GrnItemResponse> items;
}
