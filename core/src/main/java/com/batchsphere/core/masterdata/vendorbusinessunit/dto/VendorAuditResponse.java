package com.batchsphere.core.masterdata.vendorbusinessunit.dto;

import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditOutcome;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditStatus;
import com.batchsphere.core.masterdata.vendorbusinessunit.entity.VendorAuditType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class VendorAuditResponse {
    UUID id;
    UUID buId;
    VendorAuditType auditType;
    LocalDate scheduledDate;
    LocalDate completedDate;
    String auditedBy;
    VendorAuditStatus status;
    VendorAuditOutcome outcome;
    Integer observationCount;
    Integer criticalObservationCount;
    String notes;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
