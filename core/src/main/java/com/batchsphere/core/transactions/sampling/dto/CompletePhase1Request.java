package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.QcPhase1Outcome;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CompletePhase1Request {
    @NotNull
    private QcPhase1Outcome phase1Outcome;
    private String phase1RootCause;
    private Boolean ootFlag;
    private Integer retestSampleCount;
}
