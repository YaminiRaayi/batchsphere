package com.batchsphere.core.masterdata.vendor.dto;

import com.batchsphere.core.masterdata.vendor.entity.VendorCategory;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

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

    private VendorCategory vendorCategory;

    private String corporateAddress;

    private String city;

    private String state;

    private String country;

    private String pincode;

    private String gstin;

    private String pan;

    private String website;

    private Integer paymentTermsDays;

    private LocalDate approvedSince;

    private LocalDate lastAuditDate;

    private LocalDate nextAuditDue;

    private BigDecimal qaRating;

    private BigDecimal deliveryScore;

    private BigDecimal rejectionRate;

    private Integer openCapaCount;

    @NotBlank
    private String createdBy;
}
