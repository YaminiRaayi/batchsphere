package com.batchsphere.core.masterdata.vendorapproval.dto;

import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalBasis;
import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class VendorMaterialApprovalResponse {
    private UUID id;
    private UUID vendorId;
    private UUID vendorBusinessUnitId;
    private UUID supplierId;
    private UUID materialId;
    private VendorMaterialApprovalStatus status;
    private VendorMaterialApprovalBasis approvalBasis;
    private LocalDate qualificationDate;
    private LocalDate nextRequalificationDate;
    private String approvedBy;
    private String remarks;
    private Boolean isActive;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
