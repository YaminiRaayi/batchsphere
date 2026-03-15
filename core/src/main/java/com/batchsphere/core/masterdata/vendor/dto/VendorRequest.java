package com.batchsphere.core.masterdata.vendor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VendorRequest {

    @NotBlank
    private String vendorCode;

    @NotBlank
    private String vendorName;

    private String contactPerson;

    private String email;

    private String phone;

    @NotBlank
    private String createdBy;
}
