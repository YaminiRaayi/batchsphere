package com.batchsphere.core.qms.complaint.dto;

import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.qms.complaint.entity.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplaintStatusUpdateRequest extends ESignatureRequest {

    @NotNull
    private ComplaintStatus status;

    private String reason;

    private String closureSummary;
}
