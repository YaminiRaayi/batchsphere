package com.batchsphere.core.masterdata.vendor.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class VendorApprovalRequest {

    @NotNull
    private Boolean approved;

    private LocalDate approvedSince;
}
