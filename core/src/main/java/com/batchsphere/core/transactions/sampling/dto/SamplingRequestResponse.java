package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.SamplingRequestStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class SamplingRequestResponse {
    UUID id;
    UUID grnId;
    UUID grnItemId;
    UUID materialId;
    UUID batchId;
    UUID palletId;
    SamplingRequestStatus requestStatus;
    Boolean warehouseLabelApplied;
    Boolean samplingLabelRequired;
    Boolean vendorCoaReleaseAllowed;
    Boolean photosensitiveMaterial;
    Boolean hygroscopicMaterial;
    Boolean hazardousMaterial;
    Boolean selectiveMaterial;
    String remarks;
    Integer totalContainers;
    String qcDecisionRemarks;
    String qcDecidedBy;
    LocalDateTime qcDecidedAt;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    SamplingPlanResponse plan;
}
