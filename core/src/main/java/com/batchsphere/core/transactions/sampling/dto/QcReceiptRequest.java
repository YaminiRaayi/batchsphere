package com.batchsphere.core.transactions.sampling.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class QcReceiptRequest {
    @NotBlank
    private String receivedBy;
    @NotBlank
    private String receiptCondition;
    private LocalDateTime receiptTimestamp;
    @NotBlank
    private String sampleStorageLocation;
}
