package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CapaStatusUpdateRequest extends ESignatureRequest {

    @NotNull
    private CapaStatus status;

    private String reason;

    private String completionSummary;
}
