package com.batchsphere.core.masterdata.vendorapproval.dto;

import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalBasis;
import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class VendorMaterialApprovalRequest {

    @NotNull(message = "Vendor is required")
    private UUID vendorId;

    @NotNull(message = "Vendor business unit is required")
    private UUID vendorBusinessUnitId;

    @NotNull(message = "Supplier is required")
    private UUID supplierId;

    @NotNull(message = "Material is required")
    private UUID materialId;

    @NotNull(message = "Approval status is required")
    private VendorMaterialApprovalStatus status;

    @NotNull(message = "Approval basis is required")
    private VendorMaterialApprovalBasis approvalBasis;

    private LocalDate qualificationDate;

    private LocalDate nextRequalificationDate;

    private String approvedBy;

    private String remarks;
}
