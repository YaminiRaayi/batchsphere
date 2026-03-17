package com.batchsphere.core.transcations.grn.dto;

import com.batchsphere.core.transcations.grn.entity.QcStatus;
import com.batchsphere.core.transcations.grn.entity.ContainerType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class GrnItemRequest {

    @NotNull(message = "Material id is required")
    private UUID materialId;

    private UUID batchId;

    @NotNull(message = "Received quantity is required")
    @DecimalMin(value = "0.001", message = "Received quantity must be greater than zero")
    private BigDecimal receivedQuantity;

    @NotNull(message = "Accepted quantity is required")
    @DecimalMin(value = "0.000", inclusive = true, message = "Accepted quantity cannot be negative")
    private BigDecimal acceptedQuantity;

    @NotNull(message = "Rejected quantity is required")
    @DecimalMin(value = "0.000", inclusive = true, message = "Rejected quantity cannot be negative")
    private BigDecimal rejectedQuantity;

    @NotBlank(message = "UOM is required")
    private String uom;

    @NotNull(message = "Pallet id is required")
    private UUID palletId;

    @NotNull(message = "Container type is required")
    private ContainerType containerType;

    @NotNull(message = "Number of containers is required")
    @Min(value = 1, message = "Number of containers must be at least 1")
    private Integer numberOfContainers;

    @NotNull(message = "Quantity per container is required")
    @DecimalMin(value = "0.001", message = "Quantity per container must be greater than zero")
    private BigDecimal quantityPerContainer;

    @NotBlank(message = "Vendor batch is required")
    private String vendorBatch;

    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private LocalDate retestDate;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Unit price cannot be negative")
    private BigDecimal unitPrice;

    @NotNull(message = "QC status is required")
    private QcStatus qcStatus;

    private String description;
}
