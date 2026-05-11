package com.batchsphere.core.masterdata.supplier.dto.supplier.dto;

import com.batchsphere.core.masterdata.supplier.entity.SupplierQualificationStatus;
import com.batchsphere.core.masterdata.supplier.entity.SupplierType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class SupplierResponse {
    private UUID id;
    private String supplierCode;
    private String supplierName;
    private String contactPerson;
    private String email;
    private String phone;
    private SupplierType supplierType;
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
    private Boolean isActive;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
