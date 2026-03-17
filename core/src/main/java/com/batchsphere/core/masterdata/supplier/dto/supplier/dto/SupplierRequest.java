package com.batchsphere.core.masterdata.supplier.dto.supplier.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SupplierRequest {

    @NotBlank(message = "Supplier code is required")
    private String supplierCode;

    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    private String contactPerson;

    private String email;

    private String phone;

    @NotBlank(message = "CreatedBy is required")
    private String createdBy;
}