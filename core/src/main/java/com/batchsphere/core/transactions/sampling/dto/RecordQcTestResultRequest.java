package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class RecordQcTestResultRequest {
    private BigDecimal resultValue;
    @Size(max = 500)
    private String resultText;
    private UUID moaIdUsed;
    @Size(max = 500)
    private String remarks;
}
