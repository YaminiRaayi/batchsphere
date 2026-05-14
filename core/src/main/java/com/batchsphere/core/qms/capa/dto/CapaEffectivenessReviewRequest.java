package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import com.batchsphere.core.qms.capa.entity.CapaEffectivenessOutcome;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CapaEffectivenessReviewRequest extends ESignatureRequest {

    @NotNull(message = "Effectiveness outcome is required")
    private CapaEffectivenessOutcome outcome;

    private String comments;
}
