package com.batchsphere.core.qms.deviation.dto;

import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.qms.deviation.entity.DeviationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeviationStatusUpdateRequest extends ESignatureRequest {

    @NotNull
    private DeviationStatus status;

    private String reason;

    private String closureSummary;
}
