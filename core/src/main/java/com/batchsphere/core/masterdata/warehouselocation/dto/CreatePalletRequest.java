package com.batchsphere.core.masterdata.warehouselocation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePalletRequest {

    @NotBlank
    private String palletCode;

    @NotBlank
    private String palletName;

    private String description;

    @NotBlank
    private String createdBy;
}
