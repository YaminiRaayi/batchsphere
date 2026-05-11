package com.batchsphere.core.compliance.esign.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ESignatureRequest {
    private String username;
    private String password;
    private String meaning;
}
