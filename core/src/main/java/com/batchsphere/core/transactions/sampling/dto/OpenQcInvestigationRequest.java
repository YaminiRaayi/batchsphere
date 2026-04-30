package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;

@Data
public class OpenQcInvestigationRequest {
    @NotNull
    private UUID qcTestResultId;
    @NotBlank
    private String reason;
    private String initialAssessment;
    private QcInvestigationType investigationType;
}
