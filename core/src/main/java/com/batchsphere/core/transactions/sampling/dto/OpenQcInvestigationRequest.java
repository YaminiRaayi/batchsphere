package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;

@Data
public class OpenQcInvestigationRequest {
    @NotNull
    private UUID qcTestResultId;
    @NotBlank
    @Size(min = 20, message = "Investigation reason must be at least 20 characters (ALCOA+ requirement)")
    private String reason;
    private String initialAssessment;
    private QcInvestigationType investigationType;
}
