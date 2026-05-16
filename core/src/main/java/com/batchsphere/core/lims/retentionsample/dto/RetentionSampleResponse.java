package com.batchsphere.core.lims.retentionsample.dto;

import com.batchsphere.core.lims.retentionsample.entity.RetentionSampleStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class RetentionSampleResponse {

    private UUID id;
    private UUID samplingRequestId;
    private String lotNumber;
    private UUID materialId;
    private String materialName;
    private BigDecimal quantity;
    private String uom;
    private String containerDescription;
    private String storageLocation;
    private String storageCondition;
    private LocalDate retentionUntil;
    private long daysUntilExpiry;
    private RetentionSampleStatus status;
    private String receivedBy;
    private OffsetDateTime receivedAt;
    private String retrievalReason;
    private String retrievedBy;
    private OffsetDateTime retrievedAt;
    private String testResultReference;
    private String disposalReason;
    private String disposedBy;
    private OffsetDateTime disposedAt;
    private String disposalMethod;
    private String createdBy;
    private OffsetDateTime createdAt;
    private String updatedBy;
    private OffsetDateTime updatedAt;
}
