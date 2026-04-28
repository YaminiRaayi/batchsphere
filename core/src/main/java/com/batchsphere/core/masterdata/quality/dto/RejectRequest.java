package com.batchsphere.core.masterdata.quality.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectRequest {
    @NotBlank
    private String reviewRemarks;
}
