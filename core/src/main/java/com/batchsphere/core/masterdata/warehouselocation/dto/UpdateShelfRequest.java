package com.batchsphere.core.masterdata.warehouselocation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateShelfRequest {

    @NotBlank
    private String shelfCode;

    @NotBlank
    private String shelfName;

    private String description;

    @NotBlank
    private String updatedBy;
}
