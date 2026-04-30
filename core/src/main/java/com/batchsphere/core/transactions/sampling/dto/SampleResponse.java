package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.SampleStatus;
import com.batchsphere.core.transactions.sampling.entity.SampleType;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class SampleResponse {
    UUID id;
    String sampleNumber;
    UUID samplingRequestId;
    UUID batchId;
    UUID materialId;
    SampleType sampleType;
    SampleStatus sampleStatus;
    BigDecimal sampleQuantity;
    String uom;
    String collectedBy;
    LocalDateTime collectedAt;
    String samplingLocation;
    String handoffToQcBy;
    LocalDateTime handoffToQcAt;
    String receivedByQc;
    LocalDateTime receivedAtQc;
    String receiptCondition;
    String qcStorageLocation;
    Boolean retainedFlag;
    Boolean consumedFlag;
    Boolean destroyedFlag;
    BigDecimal retainedQuantity;
    LocalDate retainedUntil;
    Boolean retentionExpired;
    String remarks;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
    List<SampleContainerLinkResponse> containerLinks;
}
