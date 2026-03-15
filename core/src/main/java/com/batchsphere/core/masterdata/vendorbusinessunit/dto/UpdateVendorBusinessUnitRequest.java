package com.batchsphere.core.masterdata.vendorbusinessunit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateVendorBusinessUnitRequest {

    @NotBlank
    private String unitName;

    private String address;

    private String city;

    private String state;

    private String country;

    @NotBlank
    private String updatedBy;
}
