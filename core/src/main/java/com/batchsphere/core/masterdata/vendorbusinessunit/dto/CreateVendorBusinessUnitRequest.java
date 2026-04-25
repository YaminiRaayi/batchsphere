package com.batchsphere.core.masterdata.vendorbusinessunit.dto;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.SiteType;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class CreateVendorBusinessUnitRequest {

    @NotBlank
    private String unitName;

    private String buCode;

    private SiteType siteType;

    private String address;

    private String city;

    private String state;

    private String country;

    private String pincode;

    private String siteContactPerson;

    private String siteEmail;

    private String sitePhone;

    private String drugLicenseNumber;

    private LocalDate drugLicenseExpiry;

    private String gmpCertBody;

    private String gmpCertNumber;

    private LocalDate gmpCertExpiry;

    private Boolean isWhoGmpCertified;

    private Boolean isUsfda;

    private Boolean isEuGmp;

    private LocalDate qualifiedDate;

    private LocalDate nextRequalificationDue;

    private LocalDate lastAuditDate;

    private BigDecimal qaRating;

    private BigDecimal deliveryScore;

    private BigDecimal rejectionRate;

    private Integer openCapaCount;

    @NotBlank
    private String createdBy;
}
