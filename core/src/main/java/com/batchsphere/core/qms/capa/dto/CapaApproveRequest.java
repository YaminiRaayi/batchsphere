package com.batchsphere.core.qms.capa.dto;

import com.batchsphere.core.compliance.esign.dto.ESignatureRequest;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CapaApproveRequest extends ESignatureRequest {
    private String comments;
}
