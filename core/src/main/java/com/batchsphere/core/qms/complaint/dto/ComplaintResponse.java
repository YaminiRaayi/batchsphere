package com.batchsphere.core.qms.complaint.dto;

import com.batchsphere.core.qms.complaint.entity.ComplaintCategory;
import com.batchsphere.core.qms.complaint.entity.ComplaintSeverity;
import com.batchsphere.core.qms.complaint.entity.ComplaintSource;
import com.batchsphere.core.qms.complaint.entity.ComplaintStatus;
import com.batchsphere.core.qms.complaint.entity.RegulatoryReportability;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Value
@Builder
public class ComplaintResponse {
    UUID id;
    String complaintNumber;
    LocalDate receivedDate;
    ComplaintSource source;
    ComplaintCategory category;
    ComplaintSeverity severity;
    ComplaintStatus status;
    String productName;
    String lotNumber;
    String reportedBy;
    String description;
    String initialAssessment;
    String rootCause;
    String impactAssessment;
    Boolean recallRequired;
    RegulatoryReportability regulatoryReportability;
    LocalDate regulatoryReportDate;
    String regulatoryAuthority;
    UUID linkedDeviationId;
    UUID linkedCapaId;
    String closedBy;
    OffsetDateTime closedAt;
    String closureSummary;
    Boolean isActive;
    String createdBy;
    OffsetDateTime createdAt;
    String updatedBy;
    OffsetDateTime updatedAt;
}
