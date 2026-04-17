package com.batchsphere.core.transactions.grn.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GrnStatusUpdateRequest {

    @NotBlank(message = "Updated by is required")
    private String updatedBy;
}
