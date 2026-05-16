package com.batchsphere.core.traceability.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class LotTraceabilityResponse {
    String searchKey;
    String grnId;
    String grnNumber;
    String grnStatus;
    LocalDate receiptDate;
    String coaReviewStatus;
    String coaReviewedBy;
    LocalDateTime coaReviewedAt;
    String linkedDeviationId;
    String linkedDeviationNumber;
    String materialId;
    String materialCode;
    String materialName;
    String vendorBatch;
    BigDecimal receivedQuantity;
    String uom;
    List<TraceabilityEvent> timeline;
}
