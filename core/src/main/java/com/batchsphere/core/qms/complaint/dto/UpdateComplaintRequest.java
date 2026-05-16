package com.batchsphere.core.qms.complaint.dto;

import com.batchsphere.core.qms.complaint.entity.ComplaintCategory;
import com.batchsphere.core.qms.complaint.entity.ComplaintSeverity;
import com.batchsphere.core.qms.complaint.entity.RegulatoryReportability;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdateComplaintRequest {

    @NotNull
    private ComplaintCategory category;

    @NotNull
    private ComplaintSeverity severity;

    private String productName;

    private String lotNumber;

    private String reportedBy;

    private String description;

    private String initialAssessment;

    private String rootCause;

    private String impactAssessment;

    private boolean recallRequired;

    private RegulatoryReportability regulatoryReportability;

    private String regulatoryAuthority;

    private LocalDate regulatoryReportDate;
}
