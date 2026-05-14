package com.batchsphere.core.qms.changecontrol.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeControlApproveRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    private String meaning;
    private String comments;
}
