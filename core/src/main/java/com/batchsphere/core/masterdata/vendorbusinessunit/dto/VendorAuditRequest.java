package com.batchsphere.core.masterdata.vendorbusinessunit.dto;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditOutcome;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class VendorAuditRequest {

    @NotNull
    private VendorAuditType auditType;

    @NotNull
    private LocalDate scheduledDate;

    private LocalDate completedDate;

    @NotBlank
    private String auditedBy;

    private VendorAuditStatus status;

    private VendorAuditOutcome outcome;

    private Integer observationCount;

    private Integer criticalObservationCount;

    private String notes;
}
