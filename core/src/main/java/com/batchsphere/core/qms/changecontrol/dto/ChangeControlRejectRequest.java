package com.batchsphere.core.qms.changecontrol.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeControlRejectRequest {
    @NotBlank
    private String reason;
}
