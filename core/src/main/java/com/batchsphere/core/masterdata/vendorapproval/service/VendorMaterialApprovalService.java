package com.batchsphere.core.masterdata.vendorapproval.service;

import com.batchsphere.core.masterdata.vendorapproval.dto.VendorMaterialApprovalRequest;
import com.batchsphere.core.masterdata.vendorapproval.dto.VendorMaterialApprovalResponse;
import com.batchsphere.core.masterdata.vendorapproval.entity.VendorMaterialApprovalStatus;

import java.util.List;
import java.util.UUID;

public interface VendorMaterialApprovalService {
    VendorMaterialApprovalResponse createApproval(VendorMaterialApprovalRequest request);
    VendorMaterialApprovalResponse updateApproval(UUID id, VendorMaterialApprovalRequest request);
    VendorMaterialApprovalResponse getApproval(UUID id);
    List<VendorMaterialApprovalResponse> getApprovals(UUID vendorId, UUID vendorBusinessUnitId, UUID supplierId, UUID materialId, VendorMaterialApprovalStatus status);
    void deactivateApproval(UUID id);
}
