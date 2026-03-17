package com.batchsphere.core.masterdata.warehouselocation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateRackRequest {

    @NotBlank
    private String rackCode;

    @NotBlank
    private String rackName;

    private String description;

    @NotBlank
    private String updatedBy;
}
