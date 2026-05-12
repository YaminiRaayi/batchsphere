package com.batchsphere.core.qms.document.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentApprovalRequest {
    private String comments;

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    private String meaning;
}
