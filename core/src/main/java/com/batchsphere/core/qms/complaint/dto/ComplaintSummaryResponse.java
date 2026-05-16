package com.batchsphere.core.qms.complaint.dto;

import com.batchsphere.core.qms.complaint.entity.ComplaintCategory;
import com.batchsphere.core.qms.complaint.entity.ComplaintSeverity;
import com.batchsphere.core.qms.complaint.entity.ComplaintStatus;
import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class ComplaintSummaryResponse {
    Map<ComplaintStatus, Long> countsByStatus;
    Map<ComplaintCategory, Long> countsByCategory;
    Map<ComplaintSeverity, Long> countsBySeverity;
}
