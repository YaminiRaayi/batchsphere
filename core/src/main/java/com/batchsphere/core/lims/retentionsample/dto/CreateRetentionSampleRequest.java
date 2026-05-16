package com.batchsphere.core.lims.retentionsample.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateRetentionSampleRequest {

    @NotNull(message = "samplingRequestId is required")
    private UUID samplingRequestId;

    @NotBlank(message = "lotNumber is required")
    private String lotNumber;

    private UUID materialId;
    private String materialName;

    @NotNull(message = "quantity is required")
    @DecimalMin(value = "0.0001", message = "quantity must be positive")
    private BigDecimal quantity;

    @NotBlank(message = "uom is required")
    private String uom;

    private String containerDescription;

    @NotBlank(message = "storageLocation is required")
    private String storageLocation;

    private String storageCondition;

    private LocalDate retentionUntil;
}
