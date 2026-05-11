package com.batchsphere.core.masterdata.supplier.dto.supplier.dto;

import com.batchsphere.core.masterdata.supplier.entity.SupplierQualificationStatus;
import com.batchsphere.core.masterdata.supplier.entity.SupplierType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

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

    @NotNull(message = "Supplier type is required")
    private SupplierType supplierType;

    @NotNull(message = "Qualification status is required")
    private SupplierQualificationStatus qualificationStatus;

    private String countryOfManufacture;

    private String gmpcertNumber;

    private String gmpcertIssuingAuthority;

    private LocalDate gmpcertExpiryDate;

    private LocalDate approvedSince;

    private LocalDate lastAuditDate;

    private LocalDate nextAuditDue;

    private BigDecimal rejectionRate;

    private Integer openCapaCount;

    @NotBlank(message = "CreatedBy is required")
    private String createdBy;
}
