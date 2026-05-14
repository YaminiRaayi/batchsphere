package com.batchsphere.core.qms.changecontrol.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeControlCloseRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    private String meaning;
    @NotBlank
    private String closureSummary;
}
