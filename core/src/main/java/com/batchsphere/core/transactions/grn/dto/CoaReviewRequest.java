package com.batchsphere.core.transactions.grn.dto;

import com.batchsphere.core.transactions.grn.entity.CoaReviewStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CoaReviewRequest {
    @NotNull(message = "CoA review status is required")
    private CoaReviewStatus coaReviewStatus;
    private String coaReviewRemarks;
    private BigDecimal temperatureOnArrival;
    private Boolean coldChainCompliant;
    private String containerCondition;
    private String labelVerificationStatus;
    private String quantityVarianceReason;
}
