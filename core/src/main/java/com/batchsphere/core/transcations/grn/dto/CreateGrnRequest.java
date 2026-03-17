package com.batchsphere.core.transcations.grn.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreateGrnRequest {

    @NotBlank(message = "GRN number is required")
    private String grnNumber;

    @NotNull(message = "Supplier id is required")
    private UUID supplierId;

    @NotNull(message = "Vendor id is required")
    private UUID vendorId;

    @NotNull(message = "Vendor business unit id is required")
    private UUID vendorBusinessUnitId;

    @NotNull(message = "Receipt date is required")
    private LocalDate receiptDate;

    private String invoiceNumber;

    private String remarks;

    @NotBlank(message = "Created by is required")
    private String createdBy;

    @Valid
    @NotEmpty(message = "At least one GRN item is required")
    private List<GrnItemRequest> items;
}
