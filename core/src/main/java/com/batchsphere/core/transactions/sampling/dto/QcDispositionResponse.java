package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.QcDispositionStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class QcDispositionResponse {
    UUID id;
    UUID sampleId;
    UUID samplingRequestId;
    QcDispositionStatus status;
    String decisionRemarks;
    String decisionBy;
    LocalDateTime decisionAt;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
