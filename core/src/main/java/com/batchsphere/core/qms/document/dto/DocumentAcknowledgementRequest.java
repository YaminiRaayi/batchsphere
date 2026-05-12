package com.batchsphere.core.qms.document.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DocumentAcknowledgementRequest {
    private String comments;
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    private String meaning;
}
