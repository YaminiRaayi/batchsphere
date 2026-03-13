package com.batchsphere.core.batch.dto;

import com.batchsphere.core.batch.entity.BatchType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NonNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class BatchRequest {

    @NotBlank
    private String batchNumber;

    @NonNull
    private UUID materialId;

    @NonNull
    private BatchType batchType;

    @NonNull
    private BigDecimal quantity;

    @NotBlank
    private String unitOfMeasure;

    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private LocalDate retestDate;

    @NotBlank
    private String createdBy;
}
