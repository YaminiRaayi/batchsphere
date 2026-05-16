package com.batchsphere.core.qms.riskassessment.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RiskAssessmentSummaryResponse {
    long total;
    long highRpnCount;
    long pendingAcceptance;
    long criticalItems;
}
